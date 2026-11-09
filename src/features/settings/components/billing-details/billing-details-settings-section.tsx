import { IconReceipt } from "@tabler/icons-react";
import { useSelector } from "@tanstack/react-store";
import { useState } from "react";
import {
	BILLING_TEXT_NAME,
	type BillingDetailsSettings,
	type BillingCatalogueField,
	STRUCTURED_BILLING_FIELDS,
	VAT_ID_FIELD,
} from "@/features/settings/billing-details-schema";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { Form } from "@/shared/components/composable/form";
import { cn } from "@/shared/lib/utils";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/shared/ui/accordion";
import { SegmentedControl } from "@/shared/ui/segmented-control";
import { BillingDetailsPreview } from "./billing-details-preview";
import { IncompleteCountWarning } from "./incomplete-count-warning";
import { ModeSwitchWarning } from "./mode-switch-warning";
import {
	type BillingDetailsSettingsForm,
	useBillingDetailsSettings,
} from "./use-billing-details-settings";

const MODES = [
	{
		mode: "FREE_TEXT",
		title: "Simple",
		text: "One text box — participants type the billing details freely.",
	},
	{
		mode: "STRUCTURED",
		title: "Separate fields",
		text: "Organization, street, postal code and city as separate fields.",
	},
] as const;

const STATE_OPTIONS = [
	{ value: "OFF", label: "Off" },
	{ value: "OPTIONAL", label: "Optional" },
	{ value: "REQUIRED", label: "Required" },
] as const;

const STATE_VIEW = {
	OFF: { text: "Off", dot: "bg-muted-foreground/40" },
	OPTIONAL: { text: "Optional", dot: "bg-sky-500" },
	REQUIRED: { text: "Required", dot: "bg-primary" },
} as const;

function ModeCards({ form }: { form: BillingDetailsSettingsForm }) {
	return (
		<form.Field name="mode">
			{(field) => (
				<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
					{MODES.map((m) => (
						<button
							aria-pressed={field.state.value === m.mode}
							className={cn(
								"rounded-lg border p-3 text-left transition-colors",
								field.state.value === m.mode
									? "border-primary bg-primary/5 ring-primary ring-1"
									: "hover:bg-muted/50",
							)}
							data-testid={`billing-mode-${m.mode}`}
							key={m.mode}
							onClick={() => field.handleChange(m.mode)}
							type="button"
						>
							<span className="block text-sm font-medium">{m.title}</span>
							<span className="text-muted-foreground block text-xs">
								{m.text}
							</span>
						</button>
					))}
				</div>
			)}
		</form.Field>
	);
}

function RowTrigger({
	name,
	label,
	help,
	state,
}: {
	name: string;
	label: string;
	help: string;
	state: { text: string; dot: string; off?: boolean };
}) {
	return (
		<AccordionTrigger className="hover:no-underline">
			<span className="min-w-0">
				<span
					className={cn(
						"block text-sm font-medium",
						state.off && "text-muted-foreground",
					)}
				>
					{name}
				</span>
				<span className="text-muted-foreground flex items-center gap-1.5 text-xs font-normal">
					<span
						aria-hidden
						className={cn("size-2 shrink-0 rounded-full", state.dot)}
					/>
					<span className="shrink-0" data-testid="billing-field-state">
						{state.text}
					</span>
					<span className="truncate">
						· “{label}”{help ? " · has help text" : ""}
					</span>
				</span>
			</span>
		</AccordionTrigger>
	);
}

function TextBoxRow({ form }: { form: BillingDetailsSettingsForm }) {
	const text = useSelector(form.store, (s) => s.values.text);
	const invoiceRequired = useSelector(
		form.store,
		(s) => s.values.invoiceRequired,
	);

	return (
		<AccordionItem value="text">
			<RowTrigger
				help={text.help}
				label={text.label || BILLING_TEXT_NAME}
				name="Text box"
				state={{
					...STATE_VIEW.REQUIRED,
					text: invoiceRequired ? "Required" : "Required with invoice",
				}}
			/>
			<AccordionContent className="space-y-3 px-1 pb-3">
				<p className="text-muted-foreground text-xs">
					Required whenever the participant needs an invoice.
				</p>
				<form.AppField name="text.label">
					{(field) => (
						<field.InputField label="Label" placeholder={BILLING_TEXT_NAME} />
					)}
				</form.AppField>
				<form.AppField name="text.help">
					{(field) => (
						<field.TextareaField
							description="Shown under the field. Leave empty for none."
							label="Help text"
							rows={2}
						/>
					)}
				</form.AppField>
			</AccordionContent>
		</AccordionItem>
	);
}

function FieldRow({
	form,
	field: f,
}: {
	form: BillingDetailsSettingsForm;
	field: BillingCatalogueField;
}) {
	const config = useSelector(form.store, (s) => s.values.fields[f.key]);
	const stateLabelId = `billing-field-${f.key}-state`;

	return (
		<AccordionItem value={f.key}>
			<RowTrigger
				help={config.help}
				label={config.label || f.name}
				name={f.name}
				state={{ ...STATE_VIEW[config.state], off: config.state === "OFF" }}
			/>
			<AccordionContent className="space-y-3 px-1 pb-3">
				<form.AppField name={`fields.${f.key}.label` as const}>
					{(field) => <field.InputField label="Label" placeholder={f.name} />}
				</form.AppField>
				<form.Field name={`fields.${f.key}.state` as const}>
					{(field) => (
						<div className="space-y-1">
							<span className="text-sm font-medium" id={stateLabelId}>
								State
							</span>
							<SegmentedControl
								labelledBy={stateLabelId}
								onChange={field.handleChange}
								options={STATE_OPTIONS}
								value={field.state.value}
							/>
						</div>
					)}
				</form.Field>
				<form.AppField name={`fields.${f.key}.help` as const}>
					{(field) => (
						<field.TextareaField
							description="Shown under the field. Leave empty for none."
							label="Help text"
							rows={2}
						/>
					)}
				</form.AppField>
			</AccordionContent>
		</AccordionItem>
	);
}

function FieldAccordion({ form }: { form: BillingDetailsSettingsForm }) {
	const mode = useSelector(form.store, (s) => s.values.mode);

	return (
		<Accordion className="rounded-lg border px-3">
			{mode === "FREE_TEXT" ? (
				<TextBoxRow form={form} />
			) : (
				STRUCTURED_BILLING_FIELDS.map((f) => (
					<FieldRow field={f} form={form} key={f.key} />
				))
			)}
			<FieldRow field={VAT_ID_FIELD} form={form} />
		</Accordion>
	);
}

export function BillingDetailsSettingsSection({
	initialData,
}: {
	initialData: BillingDetailsSettings;
}) {
	const form = useBillingDetailsSettings(initialData);
	const config = useSelector(form.store, (s) => s.values);
	const [pane, setPane] = useState<"configure" | "preview">("configure");

	return (
		<SettingsSection
			description="What participants enter so you can issue them an invoice."
			icon={IconReceipt}
			title="Billing details"
		>
			<div className="space-y-4">
				<div className="lg:hidden">
					<span className="sr-only" id="billing-details-pane">
						Pane
					</span>
					<SegmentedControl
						labelledBy="billing-details-pane"
						onChange={setPane}
						options={[
							{ value: "configure", label: "Configure" },
							{ value: "preview", label: "Preview" },
						]}
						value={pane}
					/>
				</div>
				<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
					<Form
						className={cn("space-y-6", pane === "preview" && "hidden lg:block")}
						onSubmit={() => {
							void form.handleSubmit();
						}}
					>
						<form.AppField name="invoiceRequired">
							{(field) => (
								<div className="space-y-1">
									<field.SwitchField
										label="Invoice required"
										testId="billing-invoice-required"
									/>
									<p className="text-muted-foreground text-xs">
										Participants can't opt out of an invoice; Billing details
										become mandatory.
									</p>
								</div>
							)}
						</form.AppField>
						<IncompleteCountWarning draft={config} saved={initialData} />
						<ModeCards form={form} />
						<FieldAccordion form={form} />
						<form.AppField name="organizerVatId">
							{(field) => (
								<field.InputField
									description="Optional. Sent to VIES with every VAT ID check, so each check returns a consultation number you can keep as proof."
									label="Organizer's EU VAT ID"
									placeholder="e.g. PL6750001923"
								/>
							)}
						</form.AppField>
						<ModeSwitchWarning
							draftMode={config.mode}
							savedMode={initialData.mode}
						/>
						<div className="flex justify-end">
							<form.AppForm>
								<form.SubmitButton label="Save" />
							</form.AppForm>
						</div>
					</Form>
					<div className={cn(pane === "configure" && "hidden lg:block")}>
						<div className="bg-background sticky top-4 rounded-xl border p-4 shadow-sm">
							<p className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">
								What participants see · Registration step 2
							</p>
							<BillingDetailsPreview config={config} />
						</div>
					</div>
				</div>
			</div>
		</SettingsSection>
	);
}
