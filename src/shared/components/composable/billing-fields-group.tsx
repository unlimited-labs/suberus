import { useSelector } from "@tanstack/react-store";
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
	needInvoiceLabel?: string;
	billingTextLabel?: string;
	billingTextPlaceholder?: string;
	countryLabel?: string;
	disabled?: boolean;
}

const props: BillingFieldsGroupProps = {};

export const BillingFieldsGroup = withFieldGroup({
	defaultValues,
	props,
	render: function Render({
		group,
		needInvoiceLabel = "I need an invoice for my organization",
		billingTextLabel = "Billing details (organization)",
		billingTextPlaceholder = "Company/organization name, billing address, VAT/Tax ID (if applicable)",
		countryLabel = "Country",
		disabled = false,
	}) {
		const needInvoice = useSelector(group.store, (s) => s.values.needInvoice);

		return (
			<>
				<group.AppField name="needInvoice">
					{(field) => <field.CheckboxField label={needInvoiceLabel} />}
				</group.AppField>

				{needInvoice && (
					<group.AppField name="billingText">
						{(field) => (
							<field.TextareaField
								disabled={disabled}
								label={billingTextLabel}
								placeholder={billingTextPlaceholder}
								rows={3}
							/>
						)}
					</group.AppField>
				)}

				<group.AppField name="country">
					{(field) => (
						<field.CountryComboboxField
							disabled={disabled}
							label={countryLabel}
						/>
					)}
				</group.AppField>
			</>
		);
	},
});
