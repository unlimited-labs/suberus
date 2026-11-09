import { IconInfoCircle } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { otherFormCountQueryOptions } from "@/features/settings/api/admin-billing-status";
import type { BillingDetailsSettings } from "@/features/settings/billing-details-schema";
import { pluralize } from "@/shared/lib/utils";

type Mode = BillingDetailsSettings["mode"];

/** Fetched on mount, so the note is ready the moment the admin picks the other mode. */
export function useModeSwitchCount(savedMode: Mode) {
	const otherMode = savedMode === "FREE_TEXT" ? "STRUCTURED" : "FREE_TEXT";
	return useQuery(otherFormCountQueryOptions(otherMode)).data ?? 0;
}

export function ModeSwitchNote({ count }: { count: number }) {
	return (
		<span
			className="text-muted-foreground mt-2 flex items-start gap-1.5 text-xs"
			data-testid="mode-switch-warning"
		>
			<IconInfoCircle className="mt-px size-3.5 shrink-0" />
			{count} {pluralize(count, "participant")} entered details in the other
			form. Their data is kept and shown to admins as previous.
		</span>
	);
}
