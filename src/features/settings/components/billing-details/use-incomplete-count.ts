import { useQuery } from "@tanstack/react-query";
import { incompleteCountQueryOptions } from "@/features/settings/api/admin-billing-status";
import {
	becomesStricter,
	requirednessOf,
} from "@/features/settings/billing-details-rules";
import type { BillingDetailsSettings } from "@/features/settings/billing-details-schema";

export function useIncompleteCount(
	saved: BillingDetailsSettings,
	draft: BillingDetailsSettings,
) {
	return useQuery({
		...incompleteCountQueryOptions(requirednessOf(draft)),
		enabled: becomesStricter(saved, draft),
	});
}
