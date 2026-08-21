import { IconBell } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	type ReminderSettings,
	reminderSettingsQueryOptions,
	updateReminderSettingsFn,
} from "@/features/settings/api/settings";
import { SettingsSection } from "@/features/settings/components/settings-section";
import {
	type ReminderFormValues,
	reminderFormSchema,
} from "@/features/settings/validations";
import { useAppForm } from "@/shared/hooks/use-app-form";
import { getErrorMessage } from "@/shared/lib/error-message";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";

interface RemindersSettingsTabProps {
	initialData: ReminderSettings;
}

function formatDaysBefore(days: number[]): string {
	return days.join(", ");
}

export function RemindersSettingsTab({
	initialData,
}: RemindersSettingsTabProps) {
	const queryClient = useQueryClient();

	const defaultValues: ReminderFormValues = {
		"reviewer-enabled": initialData.reviewer.enabled,
		"reviewer-days": formatDaysBefore(initialData.reviewer.daysBefore),
		"revision-enabled": initialData.revision.enabled,
		"revision-interval": String(initialData.revision.intervalDays),
		"revision-max": String(initialData.revision.maxCount),
		"deadline-enabled": initialData.deadline.enabled,
		"deadline-days": formatDaysBefore(initialData.deadline.daysBefore),
	};

	const form = useAppForm({
		defaultValues,
		validators: { onChange: reminderFormSchema, onSubmit: reminderFormSchema },
		onSubmit: async ({ value }) => {
			const parsed = reminderFormSchema.parse(value);
			try {
				await updateReminderSettingsFn({
					data: {
						reviewer: {
							enabled: parsed["reviewer-enabled"],
							daysBefore: parsed["reviewer-days"],
						},
						revision: {
							enabled: parsed["revision-enabled"],
							intervalDays: parsed["revision-interval"],
							maxCount: parsed["revision-max"],
						},
						deadline: {
							enabled: parsed["deadline-enabled"],
							daysBefore: parsed["deadline-days"],
						},
					},
				});
				await queryClient.invalidateQueries({
					queryKey: reminderSettingsQueryOptions().queryKey,
				});
				toast.success("Reminder settings saved");
			} catch (error) {
				toast.error(getErrorMessage(error, "Failed to save"));
			}
		},
	});

	return (
		<SettingsSection
			description="Configure automatic email reminders"
			icon={IconBell}
			title="Reminders"
		>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					void form.handleSubmit();
				}}
			>
				<div className="space-y-6">
					<div className="space-y-4">
						<form.Field name="reviewer-enabled">
							{(field) => (
								<div className="flex items-center justify-between">
									<Label className="font-medium" htmlFor={field.name}>
										Reviewer reminders
									</Label>
									<Switch
										checked={field.state.value}
										id={field.name}
										onCheckedChange={(checked) =>
											field.handleChange(checked === true)
										}
									/>
								</div>
							)}
						</form.Field>
						<p className="text-muted-foreground text-xs">
							Sent to reviewers who still have a review pending, counting down
							to their review deadline.
						</p>
						<form.Subscribe selector={(s) => s.values["reviewer-enabled"]}>
							{(enabled) => (
								<form.AppField name="reviewer-days">
									{(field) => (
										<field.InputField
											description="Comma-separated numbers. A reminder is sent for each value."
											disabled={!enabled}
											label="Days before deadline"
											placeholder="e.g. 7, 3, 1"
										/>
									)}
								</form.AppField>
							)}
						</form.Subscribe>
					</div>

					<hr className="border-border/50" />

					<div className="space-y-4">
						<form.Field name="revision-enabled">
							{(field) => (
								<div className="flex items-center justify-between">
									<Label className="font-medium" htmlFor={field.name}>
										Revision reminders
									</Label>
									<Switch
										checked={field.state.value}
										id={field.name}
										onCheckedChange={(checked) =>
											field.handleChange(checked === true)
										}
									/>
								</div>
							)}
						</form.Field>
						<p className="text-muted-foreground text-xs">
							Sent to authors asked to revise &amp; resubmit, repeated every few
							days until they upload a revision or the limit is reached.
						</p>
						<form.Subscribe selector={(s) => s.values["revision-enabled"]}>
							{(enabled) => (
								<div className="grid gap-4 sm:grid-cols-2">
									<form.AppField name="revision-interval">
										{(field) => (
											<field.InputField
												disabled={!enabled}
												label="Interval (days)"
												type="number"
											/>
										)}
									</form.AppField>
									<form.AppField name="revision-max">
										{(field) => (
											<field.InputField
												disabled={!enabled}
												label="Max reminders"
												type="number"
											/>
										)}
									</form.AppField>
								</div>
							)}
						</form.Subscribe>
					</div>

					<hr className="border-border/50" />

					<div className="space-y-4">
						<form.Field name="deadline-enabled">
							{(field) => (
								<div className="flex items-center justify-between">
									<Label className="font-medium" htmlFor={field.name}>
										Deadline reminders
									</Label>
									<Switch
										checked={field.state.value}
										id={field.name}
										onCheckedChange={(checked) =>
											field.handleChange(checked === true)
										}
									/>
								</div>
							)}
						</form.Field>
						<p className="text-muted-foreground text-xs">
							Sent to authors with an unsubmitted draft or an outstanding
							revision, counting down to the submission deadline.
						</p>
						<form.Subscribe selector={(s) => s.values["deadline-enabled"]}>
							{(enabled) => (
								<form.AppField name="deadline-days">
									{(field) => (
										<field.InputField
											description="Comma-separated numbers. A reminder is sent for each value."
											disabled={!enabled}
											label="Days before deadline"
											placeholder="e.g. 7, 3, 1"
										/>
									)}
								</form.AppField>
							)}
						</form.Subscribe>
					</div>
				</div>

				<div className="mt-6 flex justify-end">
					<form.AppForm>
						<form.SubmitButton label="Save" />
					</form.AppForm>
				</div>
			</form>
		</SettingsSection>
	);
}
