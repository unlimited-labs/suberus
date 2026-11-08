import { useSelector } from "@tanstack/react-store";
import {
	billingTextError,
	invoiceNeeded,
} from "@/features/settings/billing-details-rules";
import {
	BILLING_TEXT_NAME,
	type BillingDetailsSettings,
} from "@/features/settings/billing-details-schema";
import { withFieldGroup } from "@/shared/hooks/use-app-form";

type BillingFields = {
	needInvoice: boolean;
	billingText: string;
	country: string;
};

// Keys are used for field mapping; values are not used at runtime.
const defaultValues: BillingFields = {
	needInvoice: false,
	billingText: "",
	country: "",
};

// Props are optional (defaults applied in render); withFieldGroup does not
// apply the `props` defaults at runtime.
interface BillingFieldsGroupProps {
	/** Applies the admin's labels and requiredness; admin paths omit it and stay exempt. */
	participantConfig?: BillingDetailsSettings;
	needInvoiceLabel?: string;
	countryRequired?: boolean;
	disabled?: boolean;
}

const props: BillingFieldsGroupProps = {};

export const BillingFieldsGroup = withFieldGroup({
	defaultValues,
	props,
	render: function Render({
		group,
		participantConfig,
		needInvoiceLabel = "I need an invoice for my organization",
		countryRequired = false,
		disabled = false,
	}) {
		const needInvoice = useSelector(group.store, (s) => s.values.needInvoice);
		const invoiceRequired = participantConfig?.invoiceRequired === true;
		const billingTextRequired =
			participantConfig !== undefined &&
			invoiceNeeded(needInvoice, participantConfig);
		const label = participantConfig?.text.label || BILLING_TEXT_NAME;

		return (
			<>
				{!invoiceRequired && (
					<group.AppField name="needInvoice">
						{(field) => <field.CheckboxField label={needInvoiceLabel} />}
					</group.AppField>
				)}

				{(needInvoice || invoiceRequired) && (
					<group.AppField
						name="billingText"
						validators={{
							onChange: ({ value }) =>
								billingTextError(value, billingTextRequired),
						}}
					>
						{(field) => (
							<field.TextareaField
								description={participantConfig?.text.help || undefined}
								disabled={disabled}
								label={billingTextRequired ? `${label} *` : label}
								placeholder="Company/organization name, billing address, VAT/Tax ID (if applicable)"
								rows={3}
							/>
						)}
					</group.AppField>
				)}

				<group.AppField
					name="country"
					validators={{
						onChange: ({ value }) =>
							countryRequired && value.length === 0
								? "Country is required"
								: undefined,
					}}
				>
					{(field) => (
						<field.CountryComboboxField
							disabled={disabled}
							label={countryRequired ? "Country *" : "Country"}
						/>
					)}
				</group.AppField>
			</>
		);
	},
});
