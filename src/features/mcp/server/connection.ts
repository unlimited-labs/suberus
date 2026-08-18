import { randomBytes } from "node:crypto";
import { env } from "@/env";
import {
	MCP_RESOURCE,
	MCP_RESOURCE_NAME,
} from "@/features/auth/server/auth.server";
import { MCP_SCOPES } from "@/features/mcp/scopes";
import {
	callbackPortFromRedirectUri,
	DESKTOP_CLIENT_ID_PREFIX,
	desktopRedirectUri,
} from "@/features/mcp/server/desktop-client-rules";
import { DEFAULT_CALLBACK_PORT } from "@/features/mcp/validations";
import { prisma } from "@/shared/server/db.server";

export interface McpAuthorizedClient {
	clientId: string;
	name: string | null;
	scopes: string[];
	authorizedAt: Date | null;
}

export interface McpDesktopClient {
	clientId: string;
	callbackPort: number;
}

export interface McpConnectionInfo {
	enabled: boolean;
	url: string;
	desktopClient: McpDesktopClient | null;
	clients: McpAuthorizedClient[];
}

function findDesktopClient(userId: string) {
	return prisma.oauthClient.findFirst({
		where: { userId, clientId: { startsWith: DESKTOP_CLIENT_ID_PREFIX } },
		orderBy: { createdAt: "desc" },
		select: { clientId: true, redirectUris: true },
	});
}

async function describeDesktopClient(
	userId: string,
): Promise<McpDesktopClient | null> {
	const client = await findDesktopClient(userId);
	if (!client) return null;
	return {
		clientId: client.clientId,
		callbackPort:
			callbackPortFromRedirectUri(client.redirectUris[0] ?? "") ??
			DEFAULT_CALLBACK_PORT,
	};
}

/** This user's own grants, not every client registered on the instance. */
export async function getMcpConnectionInfo(
	userId: string,
): Promise<McpConnectionInfo> {
	if (!env.MCP_ENABLED) {
		return {
			enabled: false,
			url: MCP_RESOURCE,
			desktopClient: null,
			clients: [],
		};
	}

	const consents = await prisma.oauthConsent.findMany({
		where: { userId },
		orderBy: { createdAt: "desc" },
		select: { clientId: true, scopes: true, createdAt: true },
	});

	const clients = await prisma.oauthClient.findMany({
		where: { clientId: { in: consents.map((c) => c.clientId) } },
		select: { clientId: true, name: true },
	});
	const namesById = new Map(clients.map((c) => [c.clientId, c.name]));

	return {
		enabled: true,
		url: MCP_RESOURCE,
		desktopClient: await describeDesktopClient(userId),
		clients: consents.map((consent) => ({
			clientId: consent.clientId,
			name: namesById.get(consent.clientId) ?? null,
			scopes: consent.scopes,
			authorizedAt: consent.createdAt,
		})),
	};
}

/**
 * Only `oauthClientResource` has an FK on `clientId` — consents and tokens
 * carry it as a plain column and must be cleared by hand. A client this user
 * minted is deleted; a self-registered one keeps its row.
 */
export async function revokeClient(
	userId: string,
	clientId: string,
): Promise<void> {
	await prisma.oauthAccessToken.deleteMany({ where: { clientId, userId } });
	await prisma.oauthRefreshToken.deleteMany({ where: { clientId, userId } });
	await prisma.oauthConsent.deleteMany({ where: { clientId, userId } });

	if (!clientId.startsWith(DESKTOP_CLIENT_ID_PREFIX)) return;
	const owned = await prisma.oauthClient.findFirst({
		where: { clientId, userId },
		select: { clientId: true },
	});
	if (!owned) return;

	await prisma.oauthClientResource.deleteMany({ where: { clientId } });
	await prisma.oauthClient.delete({ where: { clientId } });
}

/**
 * Minted rows freeze `MCP_SCOPES`, and only the connect dialog re-mints them, so
 * a newly added scope breaks every existing CLI install with `invalid_scope`
 * until an admin happens to reopen it. Called on the authorize path instead.
 */
export async function syncDesktopClientScopes(clientId: string): Promise<void> {
	await prisma.oauthClient.updateMany({
		where: {
			clientId: { equals: clientId, startsWith: DESKTOP_CLIENT_ID_PREFIX },
		},
		data: { scopes: [...MCP_SCOPES] },
	});
}

/**
 * Replaces CIMD/DCR for desktop assistants: a configured `oauth.clientId`
 * short-circuits both, and Claude Code's metadata document is rejected here
 * anyway (portless loopback URIs). Idempotent — re-minting re-points the row.
 */
export async function mintDesktopClient(
	userId: string,
	callbackPort: number,
): Promise<McpDesktopClient> {
	if (!env.MCP_ENABLED) {
		throw new Error("MCP server is disabled on this instance");
	}

	// The link is mandatory (enforcePerClientResources) and its FK targets a row
	// better-auth only seeds at boot.
	await prisma.oauthResource.upsert({
		where: { identifier: MCP_RESOURCE },
		update: {},
		create: {
			identifier: MCP_RESOURCE,
			name: MCP_RESOURCE_NAME,
			allowedScopes: [...MCP_SCOPES],
			createdAt: new Date(),
			updatedAt: new Date(),
		},
	});

	const existing = await findDesktopClient(userId);

	const clientId =
		existing?.clientId ??
		`${DESKTOP_CLIENT_ID_PREFIX}${randomBytes(24).toString("base64url")}`;

	const shape = {
		name: "Desktop AI assistant",
		redirectUris: [desktopRedirectUri(callbackPort)],
		grantTypes: ["authorization_code", "refresh_token"],
		responseTypes: ["code"],
		tokenEndpointAuthMethod: "none",
		applicationType: "native",
		scopes: [...MCP_SCOPES],
		requirePKCE: true,
		disabled: false,
		updatedAt: new Date(),
	};

	await prisma.oauthClient.upsert({
		where: { clientId },
		update: shape,
		create: { ...shape, clientId, userId, createdAt: new Date() },
	});

	await prisma.oauthClientResource.upsert({
		where: { clientId_resourceId: { clientId, resourceId: MCP_RESOURCE } },
		update: {},
		create: { clientId, resourceId: MCP_RESOURCE, createdAt: new Date() },
	});

	return { clientId, callbackPort };
}
