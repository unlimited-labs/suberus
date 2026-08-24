import { IconCalendar } from "@tabler/icons-react";
import { useSelector } from "@tanstack/react-store";
import type { ConferenceSettings } from "@/features/settings/api/settings";
import { SettingsSaveButton } from "@/features/settings/components/settings-save-button";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { Form } from "@/shared/components/composable/form";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";
import {
	type ConferenceDatesFormApi,
	useConferenceDatesForm,
} from "./use-conference-settings";

interface ImportantDatesSectionProps {
	initialData: ConferenceSettings;
}

interface LockSwitchProps {
	form: ConferenceDatesFormApi;
	name: "submissionsLocked" | "registrationLocked";
	label: string;
	hint: string;
}

function LockSwitch({ form, name, label, hint }: LockSwitchProps) {
	return (
		<div className="border-border/50 flex items-center justify-between rounded-lg border p-3 sm:col-span-2">
			<div>
				<Label htmlFor={name}>{label}</Label>
				<p className="text-muted-foreground text-xs">{hint}</p>
			</div>
			<form.Field name={name}>
				{(field) => (
					<Switch
						checked={field.state.value}
						id={name}
						onCheckedChange={(checked) => field.handleChange(checked === true)}
					/>
				)}
			</form.Field>
		</div>
	);
}

export function ImportantDatesSection({
	initialData,
}: ImportantDatesSectionProps) {
	const form = useConferenceDatesForm(initialData);
	const isSubmitting = useSelector(form.store, (s) => s.isSubmitting);

	return (
		<SettingsSection
			delay={100}
			description="Conference, submission and review deadlines"
			icon={IconCalendar}
			title="Important Dates"
		>
			<Form onSubmit={() => void form.handleSubmit()}>
				<div className="grid gap-4 sm:grid-cols-2">
					<form.AppField name="conferenceStartDate">
						{(field) => (
							<field.InputField
								description="First day of the conference"
								label="Conference Start"
								type="date"
							/>
						)}
					</form.AppField>
					<form.AppField name="conferenceEndDate">
						{(field) => (
							<field.InputField
								description="Last day of the conference"
								label="Conference End"
								type="date"
							/>
						)}
					</form.AppField>
					<form.AppField name="submissionDeadline">
						{(field) => (
							<field.InputField
								description="After this date the system automatically stops accepting new submissions. Leave empty for no limit."
								label="Submission Deadline"
								type="date"
							/>
						)}
					</form.AppField>
					<form.AppField name="registrationDeadline">
						{(field) => (
							<field.InputField
								description="After this date public registration is blocked. Invitation-based registration still works. Leave empty for no limit."
								label="Registration Deadline"
								type="date"
							/>
						)}
					</form.AppField>
					<LockSwitch
						form={form}
						hint="Immediately block all new submissions, regardless of the deadline"
						label="Close submissions"
						name="submissionsLocked"
					/>
					<LockSwitch
						form={form}
						hint="Immediately block public registration, regardless of the deadline. Invited users can still register."
						label="Close registration"
						name="registrationLocked"
					/>
					<form.AppField name="reviewDeadline">
						{(field) => (
							<field.InputField
								description="Deadline for reviewers to submit their reviews"
								label="Review Deadline"
								type="date"
							/>
						)}
					</form.AppField>
					<form.AppField name="notificationDate">
						{(field) => (
							<field.InputField
								description="Date when authors are notified of the decision"
								label="Notification Date"
								type="date"
							/>
						)}
					</form.AppField>
				</div>
				<SettingsSaveButton
					isSaving={isSubmitting}
					onSave={() => void form.handleSubmit()}
				/>
			</Form>
		</SettingsSection>
	);
}
