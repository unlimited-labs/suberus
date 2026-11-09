import { IconInfoCircle } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { otherFormCountQueryOptions } from "@/features/settings/api/admin-billing-status";
import type { BillingDetailsSettings } from "@/features/settings/billing-details-schema";
import { pluralize } from "@/shared/lib/utils";
import { Alert, AlertDescription } from "@/shared/ui/alert";

export function ModeSwitchWarning({
	savedMode,
	draftMode,
}: {
	savedMode: BillingDetailsSettings["mode"];
	draftMode: BillingDetailsSettings["mode"];
}) {
	// Fetched on mount, so the note shows the moment the admin picks the other mode.
	const { data: count } = useQuery(
		otherFormCountQueryOptions(
			savedMode === "FREE_TEXT" ? "STRUCTURED" : "FREE_TEXT",
		),
	);
	if (savedMode === draftMode || !count) return null;
	return (
		<Alert data-testid="mode-switch-warning">
			<IconInfoCircle className="size-4" />
			<AlertDescription>
				{count} {pluralize(count, "participant")} entered details in the other
				form. Their data is kept and shown to admins as previous.
			</AlertDescription>
		</Alert>
	);
}
