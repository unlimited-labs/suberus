import type { RegisterFormApi } from "@/features/auth/hooks/use-register-form";
import { registerBase } from "@/features/auth/validations";

interface RegisterStep2Props {
	form: RegisterFormApi;
	needInvoice: boolean;
}

export function RegisterStep2({ form, needInvoice }: RegisterStep2Props) {
	return (
		<div className="animate-in fade-in slide-in-from-right-4 space-y-3 duration-300">
			<form.AppField name="needInvoice">
				{(field) => (
					<field.CheckboxField label="I need an invoice for my organization" />
				)}
			</form.AppField>

			{needInvoice && (
				<form.AppField
					name="address"
					validators={{
						onChangeListenTo: ["needInvoice"],
						onChange: ({ value, fieldApi }) =>
							fieldApi.form.getFieldValue("needInvoice") &&
							value.trim().length === 0
								? "Billing details are required when invoice is needed"
								: undefined,
					}}
				>
					{(field) => (
						<field.TextareaField
							label="Billing details (organization) *"
							placeholder="Company/organization name, billing address, VAT/Tax ID (if applicable)"
							rows={3}
						/>
					)}
				</form.AppField>
			)}

			<form.AppField
				name="country"
				validators={{ onChange: registerBase.shape.country }}
			>
				{(field) => <field.CountryComboboxField label="Country *" />}
			</form.AppField>
		</div>
	);
}
