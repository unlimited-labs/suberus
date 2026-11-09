import { useQuery } from "@tanstack/react-query";
import { useSelector } from "@tanstack/react-store";
import { useState } from "react";
import { vatIdCheckQueryOptions } from "@/features/settings/api/vat-id-check";
import {
	type BillingColumnValues,
	billingFieldError,
	billingTextError,
	EMPTY_BILLING_FIELDS,
	FILLABLE_BILLING_COLUMNS,
	invoiceNeeded,
	registryFill,
} from "@/features/settings/billing-details-rules";
import {
	BILLING_TEXT_NAME,
	type BillingDetailsSettings,
	type BillingCatalogueField,
	STRUCTURED_BILLING_FIELDS,
	type StructuredBillingField,
	VAT_ID_FIELD,
} from "@/features/settings/billing-details-schema";
import { withFieldGroup } from "@/shared/hooks/use-app-form";
import { normalizeVatId } from "@/shared/lib/vat-id";
import { BuyerSummaryCard } from "./buyer-summary-card";
import { PreviousBillingCard } from "./previous-billing-card";
import { PreviousFormValues } from "./previous-form-values";
import { RegistryFillButton } from "./registry-fill-button";
import { VatIdStatus } from "./vat-id-status";

type BillingFields = {
	needInvoice: boolean;
	billingText: string;
	billingOrganization: string;
	billingStreet: string;
	billingPostalCode: string;
	billingCity: string;
	vatId: string;
	country: string;
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
	vatId: "vatId",
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
		showVat: showDetails && config.fields.vatId.state !== "OFF",
		showBuyer: showDetails && !admin,
		showPrevious: admin || (showDetails && config.mode === "STRUCTURED"),
		required: !admin && invoiceNeeded(needInvoice, config),
	};
}

function savedRevisionOf(state: {
	isSubmitSuccessful: boolean;
	submissionAttempts: number;
}) {
	return state.isSubmitSuccessful ? state.submissionAttempts : 0;
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

function catalogueRow(
	config: BillingDetailsSettings,
	f: BillingCatalogueField,
	required: boolean,
) {
	const fieldConfig = config.fields[f.key];
	const fieldRequired = required && fieldConfig.state === "REQUIRED";
	return {
		field: f,
		required: fieldRequired,
		label: withAsterisk(fieldConfig.label || f.name, fieldRequired),
		help: fieldConfig.help || undefined,
	};
}

function structuredRows(config: BillingDetailsSettings, required: boolean) {
	const postalCodeOn = config.fields.postalCode.state !== "OFF";
	return STRUCTURED_BILLING_FIELDS.filter(
		(f) => config.fields[f.key].state !== "OFF",
	).map((f) => ({
		...catalogueRow(config, f, required),
		span:
			f.key === "city" && !postalCodeOn ? "sm:col-span-3" : COLUMN_SPAN[f.key],
	}));
}

function vatIdError(value: string, required: boolean, country: string) {
	const result = normalizeVatId(value, country);
	return (
		billingFieldError(value, required) ??
		("error" in result ? result.error : undefined)
	);
}

function PreviousDetails({
	admin,
	config,
	values,
	onFill,
}: {
	admin: boolean;
	config: BillingDetailsSettings;
	values: BillingFields;
	onFill: (fill: BillingColumnValues) => void;
}) {
	return admin ? (
		<PreviousFormValues config={config} values={values} />
	) : (
		<PreviousBillingCard
			config={config}
			country={values.country}
			onFill={onFill}
			values={values}
		/>
	);
}

function useVatIdCheck(
	vatId: string,
	country: string,
	config: BillingDetailsSettings | undefined,
) {
	return useQuery({
		...vatIdCheckQueryOptions(vatId, country),
		enabled: config?.registryCheck === true && vatId.length > 0,
	}).data;
}

export const BillingFieldsGroup = withFieldGroup({
	defaultValues: EMPTY_BILLING_FIELDS,
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
		const savedRevision = useSelector(group.form.store, savedRevisionOf);
		const [checkedVatId, setCheckedVatId] = useState(values.vatId);
		const vatCheck = useVatIdCheck(checkedVatId, values.country, config);
		if (!config) throw new Error("BillingFieldsGroup needs a config");
		const isAdmin = admin === true;
		const view = billingView(config, isAdmin, values.needInvoice);
		const countryIsRequired = countryRequired === true;
		const vatRow = catalogueRow(config, VAT_ID_FIELD, view.required);
		const shownCheck = values.vatId === checkedVatId ? vatCheck : undefined;
		const applyFill = (fill: BillingColumnValues) => {
			for (const column of FILLABLE_BILLING_COLUMNS) {
				const value = fill[column];
				if (value) group.setFieldValue(column, value);
			}
		};

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

				{view.showPrevious && (
					<PreviousDetails
						admin={isAdmin}
						config={config}
						// Remount after each successful save so the card reflects what was saved.
						key={savedRevision}
						onFill={applyFill}
						values={values}
					/>
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

				{view.showVat && (
					<>
						<group.AppField
							listeners={{
								onBlur: ({ value, fieldApi }) => {
									const result = normalizeVatId(value, values.country);
									if ("value" in result && result.value !== value) {
										fieldApi.setValue(result.value);
									}
									setCheckedVatId("value" in result ? result.value : "");
								},
							}}
							name="vatId"
							validators={{
								onChange: ({ value }) =>
									vatIdError(value, vatRow.required, values.country),
							}}
						>
							{(field) => (
								<field.InputField
									description={vatRow.help}
									disabled={disabled}
									label={vatRow.label}
								/>
							)}
						</group.AppField>
						<VatIdStatus check={shownCheck} />
						<RegistryFillButton
							fill={registryFill(values, config, shownCheck)}
							onApply={applyFill}
						/>
					</>
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
