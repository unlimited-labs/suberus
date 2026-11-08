import type { RegisterFormApi } from "@/features/auth/hooks/use-register-form";
import type { BillingDetailsSettings } from "@/features/settings/billing-details-schema";
import {
	BILLING_FIELDS_MAP,
	BillingFieldsGroup,
} from "@/features/settings/components/billing-details/billing-fields-group";

interface RegisterStep2Props {
	form: RegisterFormApi;
	billingConfig: BillingDetailsSettings;
}

export function RegisterStep2({ form, billingConfig }: RegisterStep2Props) {
	return (
		<div className="animate-in fade-in slide-in-from-right-4 space-y-3 duration-300">
			<BillingFieldsGroup
				config={billingConfig}
				countryRequired
				fields={BILLING_FIELDS_MAP}
				form={form}
			/>
		</div>
	);
}
