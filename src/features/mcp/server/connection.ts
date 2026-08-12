import { env } from "@/env";
import { MCP_RESOURCE } from "@/features/auth/server/auth.server";
import { prisma } from "@/shared/server/db.server";

export interface McpAuthorizedClient {
	clientId: string;
	name: string | null;
	scopes: string[];
	authorizedAt: Date | null;
}

export interface McpConnectionInfo {
	enabled: boolean;
	url: string;
	clients: McpAuthorizedClient[];
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
		return { enabled: false, url: MCP_RESOURCE, clients: [] };
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
		clients: consents.map((consent) => ({
			clientId: consent.clientId,
			name: namesById.get(consent.clientId) ?? null,
			scopes: consent.scopes,
			authorizedAt: consent.createdAt,
		})),
	};
}
