import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { adminOnlyMiddleware } from "@/features/auth/server/middleware";
import {
	addContractor,
	getContractorSuggestions,
	getFeeSummary,
	getVatRates,
	listFinanceEntries,
	saveFinanceEntries,
} from "@/features/finances/server/finances";
import { saveFinancesSchema } from "@/features/finances/validations";

export const listFinancesFn = createServerFn({ method: "GET" })
	.middleware([adminOnlyMiddleware])
	.handler(async () => {
		const [entries, feeSummary, vatRates, contractors] = await Promise.all([
			listFinanceEntries(),
			getFeeSummary(),
			getVatRates(),
			getContractorSuggestions(),
		]);
		return { entries, feeSummary, vatRates, contractors };
	});

export const saveFinancesFn = createServerFn({ method: "POST" })
	.middleware([adminOnlyMiddleware])
	.validator(saveFinancesSchema)
	.handler(({ data }) => saveFinanceEntries(data));

export const addContractorFn = createServerFn({ method: "POST" })
	.middleware([adminOnlyMiddleware])
	.validator(z.object({ name: z.string().trim().min(1).max(200) }))
	.handler(({ data }) => addContractor(data.name));

export const financesQueryOptions = () =>
	queryOptions({
		queryKey: ["admin", "finances"],
		queryFn: () => listFinancesFn(),
	});
