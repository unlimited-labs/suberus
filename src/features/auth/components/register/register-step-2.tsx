import type { RegisterFormApi } from "@/features/auth/hooks/use-register-form";
import type { BillingDetailsSettings } from "@/features/settings/billing-details-schema";
import { BillingFieldsGroup } from "@/features/settings/components/billing-details/billing-fields-group";

interface RegisterStep2Props {
	form: RegisterFormApi;
	billingConfig: BillingDetailsSettings;
}

export function RegisterStep2({ form, billingConfig }: RegisterStep2Props) {
	return (
		<div className="animate-in fade-in slide-in-from-right-4 space-y-3 duration-300">
			<BillingFieldsGroup
				countryRequired
				fields={{
					needInvoice: "needInvoice",
					billingText: "billingText",
					country: "country",
				}}
				form={form}
				participantConfig={billingConfig}
			/>
		</div>
	);
}
