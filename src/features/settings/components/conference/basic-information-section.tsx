import { IconBuilding, IconMail, IconWorld } from "@tabler/icons-react";
import { useSelector } from "@tanstack/react-store";
import { SettingsSaveButton } from "@/features/settings/components/settings-save-button";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { Label } from "@/shared/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/ui/select";
import { ConferenceTextField } from "./conference-text-field";
import type { ConferenceFormApi } from "./use-conference-settings";

interface BasicInformationSectionProps {
	form: ConferenceFormApi;
}

const iconClass =
	"text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2";

export function BasicInformationSection({
	form,
}: BasicInformationSectionProps) {
	const submissionAttempts = useSelector(
		form.store,
		(s) => s.submissionAttempts,
	);
	const isSubmitting = useSelector(form.store, (s) => s.isSubmitting);

	return (
		<SettingsSection
			description="Conference name, location and contact details"
			icon={IconBuilding}
			title="Basic Information"
		>
			<div className="grid gap-4 sm:grid-cols-2">
				<ConferenceTextField
					containerClassName="space-y-2 sm:col-span-2"
					form={form}
					label="Conference Name"
					name="name"
					placeholder="e.g. ICSE 2026"
					submissionAttempts={submissionAttempts}
				/>
				<ConferenceTextField
					containerClassName="space-y-2 sm:col-span-2"
					form={form}
					label="Conference Subtitle (optional)"
					name="subtitle"
					placeholder="e.g. International Conference on Computer Methods in Materials Technology"
					submissionAttempts={submissionAttempts}
				/>
				<ConferenceTextField
					form={form}
					label="Location"
					name="location"
					placeholder="e.g. Krakow, Poland"
					submissionAttempts={submissionAttempts}
				/>
				<ConferenceTextField
					adornment={<IconWorld className={iconClass} />}
					className="pl-8"
					form={form}
					label="Website"
					name="website"
					placeholder="https://..."
					submissionAttempts={submissionAttempts}
					type="url"
				/>
				<ConferenceTextField
					adornment={<IconMail className={iconClass} />}
					className="pl-8"
					containerClassName="space-y-2 sm:col-span-2"
					form={form}
					label="Contact Email"
					name="contactEmail"
					placeholder="contact@conference.com"
					submissionAttempts={submissionAttempts}
					type="email"
				/>
				<div className="space-y-2">
					<Label htmlFor="currency">Currency</Label>
					<form.Field name="currency">
						{(field) => (
							<Select
								onValueChange={(value) => {
									// SAFETY: the select renders only the three currency codes.
									field.handleChange(
										value as ConferenceFormApi["state"]["values"]["currency"],
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
		</SettingsSection>
	);
}
