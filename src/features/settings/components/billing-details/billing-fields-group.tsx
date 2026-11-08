import { useSelector } from "@tanstack/react-store";
import {
	billingFieldError,
	billingTextError,
	invoiceNeeded,
} from "@/features/settings/billing-details-rules";
import {
	BILLING_TEXT_NAME,
	type BillingDetailsSettings,
	STRUCTURED_BILLING_FIELDS,
	type StructuredBillingField,
} from "@/features/settings/billing-details-schema";
import { withFieldGroup } from "@/shared/hooks/use-app-form";
import { BuyerSummaryCard } from "./buyer-summary-card";

type BillingFields = {
	needInvoice: boolean;
	billingText: string;
	billingOrganization: string;
	billingStreet: string;
	billingPostalCode: string;
	billingCity: string;
	country: string;
};

// Keys are used for field mapping; values are not used at runtime.
const defaultValues: BillingFields = {
	needInvoice: false,
	billingText: "",
	billingOrganization: "",
	billingStreet: "",
	billingPostalCode: "",
	billingCity: "",
	country: "",
};

// Props are optional (defaults applied in render); withFieldGroup does not
// apply the `props` defaults at runtime.
interface BillingFieldsGroupProps {
	config?: BillingDetailsSettings;
	/** Admin paths: active layout and labels, but nothing is required. */
	admin?: boolean;
	needInvoiceLabel?: string;
	countryRequired?: boolean;
	disabled?: boolean;
}

const props: BillingFieldsGroupProps = {};

export const BILLING_FIELDS_MAP = {
	needInvoice: "needInvoice",
	billingText: "billingText",
	billingOrganization: "billingOrganization",
	billingStreet: "billingStreet",
	billingPostalCode: "billingPostalCode",
	billingCity: "billingCity",
	country: "country",
} as const;

function billingView(
	config: BillingDetailsSettings,
	admin: boolean,
	needInvoice: boolean,
) {
	const invoiceRequired = !admin && config.invoiceRequired;
	const showDetails = needInvoice || invoiceRequired;
	return {
		showCheckbox: !invoiceRequired,
		showText: showDetails && config.mode === "FREE_TEXT",
		showFields: showDetails && config.mode === "STRUCTURED",
		showBuyer: showDetails && !admin,
		required: !admin && invoiceNeeded(needInvoice, config),
	};
}

function withAsterisk(label: string, required: boolean) {
	return required ? `${label} *` : label;
}

const COLUMN_SPAN = {
	organizationName: "sm:col-span-3",
	streetAddress: "sm:col-span-3",
	postalCode: "sm:col-span-1",
	city: "sm:col-span-2",
} satisfies Record<StructuredBillingField["key"], string>;

function structuredRows(config: BillingDetailsSettings, required: boolean) {
	const postalCodeOn = config.fields.postalCode.state !== "OFF";
	return STRUCTURED_BILLING_FIELDS.filter(
		(f) => config.fields[f.key].state !== "OFF",
	).map((f) => {
		const fieldConfig = config.fields[f.key];
		const fieldRequired = required && fieldConfig.state === "REQUIRED";
		return {
			field: f,
			required: fieldRequired,
			label: withAsterisk(fieldConfig.label || f.name, fieldRequired),
			help: fieldConfig.help || undefined,
			span:
				f.key === "city" && !postalCodeOn
					? "sm:col-span-3"
					: COLUMN_SPAN[f.key],
		};
	});
}

export const BillingFieldsGroup = withFieldGroup({
	defaultValues,
	props,
	render: function Render({
		group,
		config,
		admin,
		needInvoiceLabel,
		countryRequired,
		disabled,
	}) {
		const values = useSelector(group.store, (s) => s.values);
		if (!config) throw new Error("BillingFieldsGroup needs a config");
		const view = billingView(config, admin === true, values.needInvoice);
		const countryIsRequired = countryRequired === true;

		return (
			<>
				{view.showCheckbox && (
					<group.AppField name="needInvoice">
						{(field) => (
							<field.CheckboxField
								label={
									needInvoiceLabel ?? "I need an invoice for my organization"
								}
							/>
						)}
					</group.AppField>
				)}

				{view.showText && (
					<group.AppField
						name="billingText"
						validators={{
							onChange: ({ value }) => billingTextError(value, view.required),
						}}
					>
						{(field) => (
							<field.TextareaField
								description={config.text.help || undefined}
								disabled={disabled}
								label={withAsterisk(
									config.text.label || BILLING_TEXT_NAME,
									view.required,
								)}
								placeholder="Company/organization name, billing address, VAT/Tax ID (if applicable)"
								rows={3}
							/>
						)}
					</group.AppField>
				)}

				{view.showFields && (
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
						{structuredRows(config, view.required).map((row) => (
							<div className={row.span} key={row.field.column}>
								<group.AppField
									name={row.field.column}
									validators={{
										onChange: ({ value }) =>
											billingFieldError(value, row.required),
									}}
								>
									{(field) => (
										<field.InputField
											description={row.help}
											disabled={disabled}
											label={row.label}
										/>
									)}
								</group.AppField>
							</div>
						))}
					</div>
				)}

				<group.AppField
					name="country"
					validators={{
						onChange: ({ value }) =>
							countryIsRequired && value.length === 0
								? "Country is required"
								: undefined,
					}}
				>
					{(field) => (
						<field.CountryComboboxField
							disabled={disabled}
							label={withAsterisk("Country", countryIsRequired)}
						/>
					)}
				</group.AppField>

				{view.showBuyer && <BuyerSummaryCard config={config} values={values} />}
			</>
		);
	},
});
