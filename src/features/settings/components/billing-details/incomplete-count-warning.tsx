import { IconAlertTriangle } from "@tabler/icons-react";
import type { BillingDetailsSettings } from "@/features/settings/billing-details-schema";
import { pluralize } from "@/shared/lib/utils";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { useIncompleteCount } from "./use-incomplete-count";

export function IncompleteCountWarning({
	saved,
	draft,
}: {
	saved: BillingDetailsSettings;
	draft: BillingDetailsSettings;
}) {
	const { data: count } = useIncompleteCount(saved, draft);
	if (!count) return null;
	return (
		<Alert
			className="border-yellow-500 bg-yellow-500/10"
			data-testid="incomplete-count-warning"
		>
			<IconAlertTriangle className="size-4" />
			<AlertDescription>
				{count} {pluralize(count, "participant")} will have Incomplete Billing
				details once you save.
			</AlertDescription>
		</Alert>
	);
}
