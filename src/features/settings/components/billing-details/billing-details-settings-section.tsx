import { IconReceipt } from "@tabler/icons-react";
import { useSelector } from "@tanstack/react-store";
import { useState } from "react";
import {
	BILLING_TEXT_NAME,
	type BillingDetailsSettings,
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
import { Badge } from "@/shared/ui/badge";
import { SegmentedControl } from "@/shared/ui/segmented-control";
import { BillingDetailsPreview } from "./billing-details-preview";
import {
	type BillingDetailsSettingsForm,
	useBillingDetailsSettings,
} from "./use-billing-details-settings";

const MODES = [
	{
		mode: "FREE_TEXT",
		title: "Simple",
		text: "One text box — participants type the billing details freely.",
		available: true,
	},
	{
		mode: "STRUCTURED",
		title: "Separate fields",
		text: "Organization, street, postal code and city as separate fields.",
		available: false,
	},
] as const;

function ModeCards({ form }: { form: BillingDetailsSettingsForm }) {
	return (
		<form.Field name="mode">
			{(field) => (
				<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
					{MODES.map((m) => (
						<button
							aria-pressed={field.state.value === m.mode}
							className={cn(
								"rounded-lg border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50",
								field.state.value === m.mode
									? "border-primary bg-primary/5 ring-primary ring-1"
									: "hover:bg-muted/50",
							)}
							data-testid={`billing-mode-${m.mode}`}
							disabled={!m.available}
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

function TextBoxRow({ form }: { form: BillingDetailsSettingsForm }) {
	const label = useSelector(form.store, (s) => s.values.text.label);
	const help = useSelector(form.store, (s) => s.values.text.help);

	return (
		<Accordion className="rounded-lg border px-3">
			<AccordionItem value="text">
				<AccordionTrigger className="hover:no-underline">
					<span className="min-w-0">
						<span className="block text-sm font-medium">Text box</span>
						<span className="text-muted-foreground block truncate text-xs font-normal">
							“{label || BILLING_TEXT_NAME}”{help ? " · has help text" : ""}
						</span>
					</span>
					<Badge className="ml-auto shrink-0">required</Badge>
				</AccordionTrigger>
				<AccordionContent className="space-y-3 pb-3">
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
						<ModeCards form={form} />
						<TextBoxRow form={form} />
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
