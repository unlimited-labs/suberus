import { IconBuilding, IconMail, IconWorld } from "@tabler/icons-react";
import { useSelector } from "@tanstack/react-store";
import type { ConferenceSettings } from "@/features/settings/api/settings";
import { SettingsSaveButton } from "@/features/settings/components/settings-save-button";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { Form } from "@/shared/components/composable/form";
import { Label } from "@/shared/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/ui/select";
import {
	type ConferenceBasicFormApi,
	useConferenceBasicForm,
} from "./use-conference-settings";

interface BasicInformationSectionProps {
	initialData: ConferenceSettings;
}

export function BasicInformationSection({
	initialData,
}: BasicInformationSectionProps) {
	const form = useConferenceBasicForm(initialData);
	const isSubmitting = useSelector(form.store, (s) => s.isSubmitting);

	return (
		<SettingsSection
			description="Conference name, location and contact details"
			icon={IconBuilding}
			title="Basic Information"
		>
			<Form onSubmit={() => void form.handleSubmit()}>
				<div className="grid gap-4 sm:grid-cols-2">
					<div className="sm:col-span-2">
						<form.AppField name="name">
							{(field) => (
								<field.InputField
									label="Conference Name"
									placeholder="e.g. ICSE 2026"
								/>
							)}
						</form.AppField>
					</div>
					<div className="sm:col-span-2">
						<form.AppField name="subtitle">
							{(field) => (
								<field.InputField
									label="Conference Subtitle (optional)"
									placeholder="e.g. International Conference on Computer Methods in Materials Technology"
								/>
							)}
						</form.AppField>
					</div>
					<form.AppField name="location">
						{(field) => (
							<field.InputField
								label="Location"
								placeholder="e.g. Krakow, Poland"
							/>
						)}
					</form.AppField>
					<form.AppField name="website">
						{(field) => (
							<field.IconInputField
								icon={<IconWorld className="size-4" />}
								label="Website"
								placeholder="https://..."
								type="url"
							/>
						)}
					</form.AppField>
					<div className="sm:col-span-2">
						<form.AppField name="contactEmail">
							{(field) => (
								<field.IconInputField
									icon={<IconMail className="size-4" />}
									label="Contact Email"
									placeholder="contact@conference.com"
									type="email"
								/>
							)}
						</form.AppField>
					</div>
					<div className="space-y-2">
						<Label htmlFor="currency">Currency</Label>
						<form.Field name="currency">
							{(field) => (
								<Select
									onValueChange={(value) => {
										// SAFETY: the select renders only the three currency codes.
										field.handleChange(
											value as ConferenceBasicFormApi["state"]["values"]["currency"],
										);
									}}
									value={field.state.value}
								>
									<SelectTrigger id="currency">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="EUR">EUR</SelectItem>
										<SelectItem value="USD">USD</SelectItem>
										<SelectItem value="PLN">PLN</SelectItem>
									</SelectContent>
								</Select>
							)}
						</form.Field>
					</div>
				</div>
				<SettingsSaveButton
					isSaving={isSubmitting}
					onSave={() => void form.handleSubmit()}
				/>
			</Form>
		</SettingsSection>
	);
}
