import { EMPTY_BILLING_FIELDS } from "@/features/settings/billing-details-rules";
import type { BillingDetailsSettings } from "@/features/settings/billing-details-schema";
import { useAppForm } from "@/shared/hooks/use-app-form";
import { BILLING_FIELDS_MAP, BillingFieldsGroup } from "./billing-fields-group";

export function BillingDetailsPreview({
	config,
}: {
	config: BillingDetailsSettings;
}) {
	const form = useAppForm({ defaultValues: EMPTY_BILLING_FIELDS });

	return (
		<div className="space-y-3" data-testid="billing-details-preview">
			<BillingFieldsGroup
				config={config}
				countryRequired
				fields={BILLING_FIELDS_MAP}
				form={form}
			/>
		</div>
	);
}
