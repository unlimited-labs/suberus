import { randomBytes } from "node:crypto";
import { env } from "@/env";
import {
	MCP_RESOURCE,
	MCP_RESOURCE_NAME,
	MCP_SCOPES,
} from "@/features/auth/server/auth.server";
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

async function findDesktopClient(
	userId: string,
): Promise<McpDesktopClient | null> {
	const client = await prisma.oauthClient.findFirst({
		where: { userId, clientId: { startsWith: DESKTOP_CLIENT_ID_PREFIX } },
		orderBy: { createdAt: "desc" },
		select: { clientId: true, redirectUris: true },
	});
	if (!client) return null;
	return {
		clientId: client.clientId,
		callbackPort:
			callbackPortFromRedirectUri(client.redirectUris[0] ?? "") ??
			DEFAULT_CALLBACK_PORT,
	};
}

/**
 * Applications this user has approved, not every client registered on the
 * instance: the dialog lives in the user menu, so the actionable scope is the
 * caller's own grants.
 */
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
		desktopClient: await findDesktopClient(userId),
		clients: consents.map((consent) => ({
			clientId: consent.clientId,
			name: namesById.get(consent.clientId) ?? null,
			scopes: consent.scopes,
			authorizedAt: consent.createdAt,
		})),
	};
}

/**
 * Revokes one application's access for this user. Only `oauthClientResource`
 * has a foreign key on `clientId`; consents and tokens carry it as a plain
 * column, so they have to be cleared by hand or the grants outlive the client.
 *
 * A client this user minted is deleted outright; anything else (one that
 * registered itself) keeps its row — only this user's grant to it goes.
 */
export async function revokeMcpClient(
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
 * Pre-registers a public OAuth client for a desktop assistant, replacing the
 * CIMD/DCR path: a configured `oauth.clientId` short-circuits both in the
 * client, and Claude Code's hosted metadata document is rejected here anyway
 * (portless loopback URIs on a DNS name).
 *
 * Idempotent per user — re-minting re-points the existing client at the new
 * callback port instead of accumulating rows.
 */
export async function mintMcpDesktopClient(
	userId: string,
	callbackPort: number,
): Promise<McpDesktopClient> {
	if (!env.MCP_ENABLED) {
		throw new Error("MCP server is disabled on this instance");
	}

	// The client→resource link is mandatory (enforcePerClientResources), and its
	// FK targets a row better-auth only seeds when the provider boots, so make
	// sure it is there before linking.
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

	const existing = await prisma.oauthClient.findFirst({
		where: { userId, clientId: { startsWith: DESKTOP_CLIENT_ID_PREFIX } },
		orderBy: { createdAt: "desc" },
		select: { clientId: true },
	});

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
