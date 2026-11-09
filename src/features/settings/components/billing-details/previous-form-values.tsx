import {
	type BillingColumnValues,
	previousFormValues,
} from "@/features/settings/billing-details-rules";
import type { BillingDetailsSettings } from "@/features/settings/billing-details-schema";

export function PreviousFormValues({
	values,
	config,
}: {
	values: BillingColumnValues;
	config: BillingDetailsSettings;
}) {
	const previous = previousFormValues(values, config);
	if (previous.length === 0) return null;
	return (
		<div
			className="bg-muted/40 space-y-2 rounded-lg border border-dashed p-3 text-sm"
			data-testid="previous-form-values"
		>
			<p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
				From previous form settings
			</p>
			<dl className="space-y-1.5">
				{previous.map(({ column, name, value }) => (
					<div className="grid gap-0.5 sm:grid-cols-3 sm:gap-3" key={column}>
						<dt className="text-muted-foreground">{name}</dt>
						<dd className="whitespace-pre-line sm:col-span-2">{value}</dd>
					</div>
				))}
			</dl>
		</div>
	);
}
