import type { BillingDetailsSettings } from "@/features/settings/billing-details-schema";
import { useAppForm } from "@/shared/hooks/use-app-form";
import { BillingFieldsGroup } from "./billing-fields-group";

export function BillingDetailsPreview({
	config,
}: {
	config: BillingDetailsSettings;
}) {
	const form = useAppForm({
		defaultValues: { needInvoice: false, billingText: "", country: "" },
	});

	return (
		<div className="space-y-3" data-testid="billing-details-preview">
			<BillingFieldsGroup
				countryRequired
				fields={{
					needInvoice: "needInvoice",
					billingText: "billingText",
					country: "country",
				}}
				form={form}
				participantConfig={config}
			/>
		</div>
	);
}
