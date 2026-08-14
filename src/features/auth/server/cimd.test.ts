import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { cimd } from "@better-auth/cimd";
import { mcp } from "@better-auth/mcp";
import { PrismaPg } from "@prisma/adapter-pg";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { jwt } from "better-auth/plugins";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { mcpClientRegisteredDetail } from "@/features/auth/server/cimd-audit-rules";
import { PrismaClient } from "@/generated/prisma/client";

import "dotenv/config";

function databaseUrl(): string | undefined {
	if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
	try {
		const line = readFileSync(".env", "utf-8")
			.split("\n")
			.find((l) => l.trim().startsWith("DATABASE_URL="));
		return line
			?.slice(line.indexOf("=") + 1)
			.trim()
			.replace(/^["']|["']$/g, "");
	} catch {
		return undefined;
	}
}

const DATABASE_URL = databaseUrl();
const BASE_URL = "http://localhost:3001";
const RESOURCE = `${BASE_URL}/api/mcp`;
const CLIENT_ID = "https://client.example/mcp-client.json";

// No host is contacted: isPublicRoutableHost is syntactic and the transport is
// an injected seam — which is what makes CIMD testable offline.
const metadataDocument = {
	client_id: CLIENT_ID,
	client_name: "Offline CIMD client",
	redirect_uris: ["http://127.0.0.1:9876/callback"],
	grant_types: ["authorization_code", "refresh_token"],
	response_types: ["code"],
	token_endpoint_auth_method: "none",
};

let fetchCount = 0;

function stubTransport(): Response {
	fetchCount += 1;
	return new Response(JSON.stringify(metadataDocument), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
}

function makeAuth(allowedOrigins: string[]) {
	const prisma = new PrismaClient({
		adapter: new PrismaPg({ connectionString: DATABASE_URL }),
	});
	const auth = betterAuth({
		baseURL: BASE_URL,
		secret: "test-secret-that-is-at-least-32-chars-long",
		database: prismaAdapter(prisma, { provider: "postgresql" }),
		// Mirrors auth.server.ts: oauth_* ids are @db.Uuid, but the provider mints
		// non-UUID strings without this override.
		advanced: { database: { generateId: () => randomUUID() } },
		plugins: [
			jwt(),
			mcp({
				loginPage: "/login",
				consentPage: "/consent",
				resource: RESOURCE,
				resources: [
					{
						identifier: RESOURCE,
						name: "Suberus MCP",
						allowedScopes: ["openid", "profile", "email", "offline_access"],
					},
				],
				silenceWarnings: { oauthAuthServerConfig: true },
			}),
			cimd({
				fetchClientMetadataResource: stubTransport,
				metadataProfile: "mcp-2026-07-28",
				isMetadataDocumentUrlAllowed: (url) =>
					allowedOrigins.length === 0 ||
					allowedOrigins.includes(new URL(url).origin),
				// Lazy: this pulls in src/env.ts, which rejects the partial environment
				// a run without .env leaves behind.
				onClientCreated: async ({ client, clientMetadataDocument }) => {
					const { recordMcpClientActivity } = await import(
						"@/features/auth/server/cimd-audit"
					);
					await recordMcpClientActivity({
						type: "MCP_CLIENT_REGISTERED",
						detail: mcpClientRegisteredDetail(client, clientMetadataDocument),
					});
				},
			}),
		],
	});
	return { auth, prisma };
}

function authorizeRequest(clientId: string): Request {
	const url = new URL(`${BASE_URL}/api/auth/oauth2/authorize`);
	for (const [k, v] of Object.entries({
		response_type: "code",
		client_id: clientId,
		redirect_uri: metadataDocument.redirect_uris[0],
		scope: "openid",
		state: "test-state",
		code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
		code_challenge_method: "S256",
		resource: RESOURCE,
	}))
		url.searchParams.set(k, v);
	return new Request(url, { headers: { Origin: BASE_URL } });
}

const cleanupPrisma = DATABASE_URL
	? new PrismaClient({
			adapter: new PrismaPg({ connectionString: DATABASE_URL }),
		})
	: null;

describe.skipIf(!DATABASE_URL)("CIMD client discovery (offline)", () => {
	beforeEach(async () => {
		fetchCount = 0;
		await cleanupPrisma?.oauthClient.deleteMany({
			where: { clientId: CLIENT_ID },
		});
		await cleanupPrisma?.activityLog.deleteMany({
			where: { type: "MCP_CLIENT_REGISTERED" },
		});
	});

	afterAll(async () => {
		await cleanupPrisma?.oauthClient.deleteMany({
			where: { clientId: CLIENT_ID },
		});
		await cleanupPrisma?.activityLog.deleteMany({
			where: { type: "MCP_CLIENT_REGISTERED" },
		});
		await cleanupPrisma?.$disconnect();
	});

	it("registers a client from its metadata document, without any network", async () => {
		const { auth, prisma } = makeAuth([]);
		await auth.handler(authorizeRequest(CLIENT_ID));

		const client = await prisma.oauthClient.findUnique({
			where: { clientId: CLIENT_ID },
		});
		expect(fetchCount).toBe(1);
		expect(client?.name).toBe("Offline CIMD client");
		expect(client?.clientDiscoveryId).toBe("cimd");
		expect(client?.redirectUris).toEqual(metadataDocument.redirect_uris);
		await prisma.$disconnect();
	});

	it("records the registration in the activity log, with no performer", async () => {
		const { auth, prisma } = makeAuth([]);
		await auth.handler(authorizeRequest(CLIENT_ID));

		const entries = await prisma.activityLog.findMany({
			where: { type: "MCP_CLIENT_REGISTERED" },
		});
		expect(entries).toHaveLength(1);
		expect(entries[0]?.performedBy).toBeNull();
		expect(entries[0]?.userId).toBeNull();
		expect(entries[0]?.detail).toEqual({
			type: "MCP_CLIENT_REGISTERED",
			clientId: CLIENT_ID,
			clientName: "Offline CIMD client",
			redirectUris: metadataDocument.redirect_uris,
		});
		await prisma.$disconnect();
	});

	it("refuses a document URL outside the configured origin allowlist", async () => {
		const { auth, prisma } = makeAuth(["https://trusted.example"]);
		await auth.handler(authorizeRequest(CLIENT_ID));

		const client = await prisma.oauthClient.findUnique({
			where: { clientId: CLIENT_ID },
		});
		expect(client).toBeNull();
		expect(fetchCount).toBe(0);
		await prisma.$disconnect();
	});

	it("rejects a non-HTTPS client_id before reaching the transport", async () => {
		const { auth, prisma } = makeAuth([]);
		await auth.handler(authorizeRequest("http://client.example/doc.json"));

		expect(fetchCount).toBe(0);
		await prisma.$disconnect();
	});
});
