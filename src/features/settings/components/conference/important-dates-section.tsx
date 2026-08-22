import { IconCalendar } from "@tabler/icons-react";
import { useSelector } from "@tanstack/react-store";
import { SettingsSaveButton } from "@/features/settings/components/settings-save-button";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";
import { ConferenceTextField } from "./conference-text-field";
import type { ConferenceFormApi } from "./use-conference-settings";

interface ImportantDatesSectionProps {
	form: ConferenceFormApi;
}

function Hint({ children }: { children: React.ReactNode }) {
	return <p className="text-muted-foreground text-xs">{children}</p>;
}

interface LockSwitchProps {
	form: ConferenceFormApi;
	name: "submissionsLocked" | "registrationLocked";
	label: string;
	hint: string;
}

function LockSwitch({ form, name, label, hint }: LockSwitchProps) {
	return (
		<div className="border-border/50 flex items-center justify-between rounded-lg border p-3 sm:col-span-2">
			<div>
				<Label htmlFor={name}>{label}</Label>
				<Hint>{hint}</Hint>
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

export function ImportantDatesSection({ form }: ImportantDatesSectionProps) {
	const submissionAttempts = useSelector(
		form.store,
		(s) => s.submissionAttempts,
	);
	const isSubmitting = useSelector(form.store, (s) => s.isSubmitting);

	return (
		<SettingsSection
			delay={100}
			description="Conference, submission and review deadlines"
			icon={IconCalendar}
			title="Important Dates"
		>
			<div className="grid gap-4 sm:grid-cols-2">
				<ConferenceTextField
					description={<Hint>First day of the conference</Hint>}
					form={form}
					label="Conference Start"
					name="conferenceStartDate"
					submissionAttempts={submissionAttempts}
					type="date"
				/>
				<ConferenceTextField
					description={<Hint>Last day of the conference</Hint>}
					form={form}
					label="Conference End"
					name="conferenceEndDate"
					submissionAttempts={submissionAttempts}
					type="date"
				/>
				<ConferenceTextField
					description={
						<Hint>
							After this date the system automatically stops accepting new
							submissions. Leave empty for no limit.
						</Hint>
					}
					form={form}
					label="Submission Deadline"
					name="submissionDeadline"
					submissionAttempts={submissionAttempts}
					type="date"
				/>
				<ConferenceTextField
					description={
						<Hint>
							After this date public registration is blocked. Invitation-based
							registration still works. Leave empty for no limit.
						</Hint>
					}
					form={form}
					label="Registration Deadline"
					name="registrationDeadline"
					submissionAttempts={submissionAttempts}
					type="date"
				/>
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
				<ConferenceTextField
					description={
						<Hint>Deadline for reviewers to submit their reviews</Hint>
					}
					form={form}
					label="Review Deadline"
					name="reviewDeadline"
					submissionAttempts={submissionAttempts}
					type="date"
				/>
				<ConferenceTextField
					description={
						<Hint>Date when authors are notified of the decision</Hint>
					}
					form={form}
					label="Notification Date"
					name="notificationDate"
					submissionAttempts={submissionAttempts}
					type="date"
				/>
			</div>
			<SettingsSaveButton
				isSaving={isSubmitting}
				onSave={() => void form.handleSubmit()}
			/>
		</SettingsSection>
	);
}
