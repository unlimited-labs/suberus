import { verifyOAuthQueryParams } from "@better-auth/oauth-provider";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { auth } from "@/features/auth/server/auth.server";
import { adminMiddleware } from "@/features/auth/server/middleware";
import { consentRequestInput } from "@/features/mcp/validations";
import { prisma } from "@/shared/server/db.server";

export type ConsentRequest =
	| { valid: false }
	| {
			valid: true;
			name: string | null;
			/** The only verified part of a CIMD client's identity — the name is self-asserted. */
			origin: string | null;
			scopes: string[];
	  };

/** Everything shown comes from the provider-signed query, so a crafted link can't relabel the request. */
export const getConsentRequest = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.validator(consentRequestInput)
	.handler(async ({ data }): Promise<ConsentRequest> => {
		const { secret } = await auth.$context;
		if (!(await verifyOAuthQueryParams(data.oauthQuery, secret))) {
			return { valid: false };
		}
		const query = new URLSearchParams(data.oauthQuery);
		const clientId = query.get("client_id");
		if (!clientId) return { valid: false };

		const client = await prisma.oauthClient.findUnique({
			where: { clientId },
			select: { name: true },
		});
		return {
			valid: true,
			name: client?.name ?? null,
			origin: URL.parse(clientId)?.origin ?? null,
			scopes: (query.get("scope") ?? "").split(" ").filter(Boolean),
		};
	});

export const consentRequestQueryOptions = (oauthQuery: string) =>
	queryOptions({
		queryKey: ["mcp", "consent-request", oauthQuery],
		queryFn: () => getConsentRequest({ data: { oauthQuery } }),
	});
