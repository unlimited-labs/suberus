import {
	type BillingColumnValues,
	buyerLines,
	submittedBillingValues,
} from "@/features/settings/billing-details-rules";
import type { BillingDetailsSettings } from "@/features/settings/billing-details-schema";

export function BuyerSummaryCard({
	config,
	values,
}: {
	config: BillingDetailsSettings;
	values: BillingColumnValues & { needInvoice: boolean; country: string };
}) {
	const lines = buyerLines({
		...submittedBillingValues(values, config),
		country: values.country,
	});

	if (lines.length === 0) return null;

	return (
		<div
			className="bg-muted/40 rounded-lg border p-3 text-sm"
			data-testid="buyer-summary-card"
		>
			<p className="text-muted-foreground mb-1 text-xs font-semibold tracking-wide uppercase">
				Buyer on your invoice
			</p>
			<p className="whitespace-pre-line">{lines.join("\n")}</p>
		</div>
	);
}
