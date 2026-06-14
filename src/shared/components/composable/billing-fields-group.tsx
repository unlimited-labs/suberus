import { useStore } from "@tanstack/react-form";

import { withFieldGroup } from "@/shared/hooks/use-app-form";

// Reusable invoice/billing block (needInvoice toggle + conditional address +
// country). Shared by register, profile contact info, and admin user edit.
type BillingFields = {
	needInvoice: boolean;
	address: string;
	country: string;
};

// Keys are used for field mapping; values are not used at runtime.
const defaultValues: BillingFields = {
	needInvoice: false,
	address: "",
	country: "",
};

// Props are optional (defaults applied in render); withFieldGroup does not
// apply the `props` defaults at runtime.
interface BillingFieldsGroupProps {
	needInvoiceLabel?: string;
	addressLabel?: string;
	addressPlaceholder?: string;
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
		addressLabel = "Billing details (organization)",
		addressPlaceholder = "Company/organization name, billing address, VAT/Tax ID (if applicable)",
		countryLabel = "Country",
		disabled = false,
	}) {
		const needInvoice = useStore(group.store, (s) => s.values.needInvoice);

		return (
			<>
				<group.AppField name="needInvoice">
					{(field) => <field.CheckboxField label={needInvoiceLabel} />}
				</group.AppField>

				{needInvoice && (
					<group.AppField name="address">
						{(field) => (
							<field.TextareaField
								label={addressLabel}
								rows={3}
								placeholder={addressPlaceholder}
								disabled={disabled}
							/>
						)}
					</group.AppField>
				)}

				<group.AppField name="country">
					{(field) => (
						<field.CountryComboboxField
							label={countryLabel}
							disabled={disabled}
						/>
					)}
				</group.AppField>
			</>
		);
	},
});
