import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/features/auth/server/middleware";
import { prisma } from "@/shared/server/db.server";

const consentClientInput = z.object({ clientId: z.string() });

export interface ConsentClient {
	name: string | null;
	/**
	 * Origin of the client_id URL for a CIMD client. This is the one part of a
	 * client's identity the authorization server verified itself, so it is what
	 * the consent screen anchors on — never the self-asserted name alone.
	 */
	origin: string | null;
}

export const getConsentClient = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.validator(consentClientInput)
	.handler(async ({ data }): Promise<ConsentClient> => {
		const client = await prisma.oauthClient.findUnique({
			where: { clientId: data.clientId },
			select: { name: true },
		});

		let origin: string | null = null;
		try {
			origin = new URL(data.clientId).origin;
		} catch {
			origin = null;
		}

		return { name: client?.name ?? null, origin };
	});

export const consentClientQueryOptions = (clientId: string) =>
	queryOptions({
		queryKey: ["mcp", "consent-client", clientId],
		queryFn: () => getConsentClient({ data: { clientId } }),
	});
