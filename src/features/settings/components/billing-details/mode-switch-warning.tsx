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
	const { data: count } = useQuery({
		...otherFormCountQueryOptions(draftMode),
		enabled: savedMode !== draftMode,
	});
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
