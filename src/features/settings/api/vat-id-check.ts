import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { checkTypedVatId } from "@/features/settings/server/vat-id-check";
import { allowRequest } from "@/shared/server/rate-limit";

export const checkVatIdFn = createServerFn({ method: "POST" })
	.validator(
		z.object({
			vatId: z.string().max(40),
			country: z.string().max(100).optional(),
		}),
	)
	.handler(async ({ data }) => {
		// Fail open: past the limit the participant just sees no registry status.
		if (!allowRequest("vat-id-check", 20, 60_000)) return null;
		return checkTypedVatId(data.vatId, data.country);
	});

export const vatIdCheckQueryOptions = (vatId: string, country: string) =>
	queryOptions({
		queryKey: ["vat-id-check", vatId, country],
		queryFn: () => checkVatIdFn({ data: { vatId, country } }),
		enabled: vatId.length > 0,
		staleTime: Number.POSITIVE_INFINITY,
		retry: false,
	});
