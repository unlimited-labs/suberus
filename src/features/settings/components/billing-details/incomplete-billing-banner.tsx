import { IconAlertTriangle } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { myInvoiceStateQueryOptions } from "@/features/settings/api/billing-status";
import { Alert, AlertDescription } from "@/shared/ui/alert";

export function IncompleteBillingBanner() {
	const { data: state } = useQuery(myInvoiceStateQueryOptions());
	if (state !== "INCOMPLETE") return null;
	return (
		<Alert
			className="border-yellow-500 bg-yellow-500/10"
			data-testid="incomplete-billing-banner"
		>
			<IconAlertTriangle className="size-4" />
			<AlertDescription>
				<span>
					Your billing details are incomplete.{" "}
					<Link
						className="text-primary-ink font-medium underline underline-offset-2"
						hash="contact-invoice"
						to="/profile"
					>
						Complete them
					</Link>
				</span>
			</AlertDescription>
		</Alert>
	);
}
