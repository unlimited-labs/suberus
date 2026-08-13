import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { adminMiddleware } from "@/features/auth/server/middleware";
import { mcpClientIdInput } from "@/features/mcp/validations";
import { prisma } from "@/shared/server/db.server";

export interface ConsentClient {
	name: string | null;
	/** The only verified part of a CIMD client's identity — the name is self-asserted. */
	origin: string | null;
}

export const getConsentClient = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.validator(mcpClientIdInput)
	.handler(async ({ data }): Promise<ConsentClient> => {
		const client = await prisma.oauthClient.findUnique({
			where: { clientId: data.clientId },
			select: { name: true },
		});

		return {
			name: client?.name ?? null,
			origin: URL.parse(data.clientId)?.origin ?? null,
		};
	});

export const consentClientQueryOptions = (clientId: string) =>
	queryOptions({
		queryKey: ["mcp", "consent-client", clientId],
		queryFn: () => getConsentClient({ data: { clientId } }),
	});
