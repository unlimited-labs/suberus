import { IconAlertTriangle } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { BillingDetailsSettings } from "@/features/settings/billing-details-schema";
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
				<span>
					{count === 1
						? "1 participant will have Incomplete Billing details"
						: `${count} participants will have Incomplete Billing details`}{" "}
					once you save.{" "}
					<Link
						className="text-primary-ink font-medium underline underline-offset-2"
						search={{ invoice: "INCOMPLETE" }}
						to="/admin/users"
					>
						See who
					</Link>
				</span>
			</AlertDescription>
		</Alert>
	);
}
