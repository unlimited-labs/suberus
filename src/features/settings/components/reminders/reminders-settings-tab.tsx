import { IconBell, IconLoader2 } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
	type ReminderSettings,
	reminderSettingsQueryOptions,
	updateReminderSettingsFn,
} from "@/features/settings/api/settings";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { getErrorMessage } from "@/shared/lib/error-message";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";

interface RemindersSettingsTabProps {
	initialData: ReminderSettings;
}

function parseDaysBefore(value: string): number[] {
	return value
		.split(",")
		.map((s) => Number.parseInt(s.trim(), 10))
		.filter((n) => !Number.isNaN(n) && n > 0);
}

function formatDaysBefore(days: number[]): string {
	return days.join(", ");
}

export function RemindersSettingsTab({
	initialData,
}: RemindersSettingsTabProps) {
	const queryClient = useQueryClient();
	const [data, setData] = useState(initialData);
	const [reviewerDaysText, setReviewerDaysText] = useState(() =>
		formatDaysBefore(initialData.reviewer.daysBefore),
	);
	const [deadlineDaysText, setDeadlineDaysText] = useState(() =>
		formatDaysBefore(initialData.deadline.daysBefore),
	);
	const [isSaving, setIsSaving] = useState(false);

	const handleSave = async () => {
		const reviewerDays = parseDaysBefore(reviewerDaysText);
		const deadlineDays = parseDaysBefore(deadlineDaysText);

		if (data.reviewer.enabled && reviewerDays.length === 0) {
			toast.error("Reviewer reminders need at least one days-before value");
			return;
		}
		if (data.deadline.enabled && deadlineDays.length === 0) {
			toast.error("Deadline reminders need at least one days-before value");
			return;
		}

		setIsSaving(true);
		try {
			await updateReminderSettingsFn({
				data: {
					reviewer: { ...data.reviewer, daysBefore: reviewerDays },
					revision: data.revision,
					deadline: { ...data.deadline, daysBefore: deadlineDays },
				},
			});
			await queryClient.invalidateQueries({
				queryKey: reminderSettingsQueryOptions().queryKey,
			});
			setData((prev) => ({
				...prev,
				reviewer: { ...prev.reviewer, daysBefore: reviewerDays },
				deadline: { ...prev.deadline, daysBefore: deadlineDays },
			}));
			toast.success("Reminder settings saved");
		} catch (error) {
			toast.error(getErrorMessage(error, "Failed to save"));
		}
		setIsSaving(false);
	};

	return (
		<SettingsSection
			description="Configure automatic email reminders"
			icon={IconBell}
			title="Reminders"
		>
			<div className="space-y-6">
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<Label className="font-medium" htmlFor="reviewer-enabled">
							Reviewer reminders
						</Label>
						<Switch
							checked={data.reviewer.enabled}
							id="reviewer-enabled"
							onCheckedChange={(checked) =>
								setData((prev) => ({
									...prev,
									reviewer: { ...prev.reviewer, enabled: checked === true },
								}))
							}
						/>
					</div>
					<p className="text-muted-foreground text-xs">
						Sent to reviewers who still have a review pending, counting down to
						their review deadline.
					</p>
					<div className="space-y-2">
						<Label htmlFor="reviewer-days">Days before deadline</Label>
						<Input
							disabled={!data.reviewer.enabled}
							id="reviewer-days"
							onChange={(e) => setReviewerDaysText(e.target.value)}
							placeholder="e.g. 7, 3, 1"
							value={reviewerDaysText}
						/>
						<p className="text-muted-foreground text-xs">
							Comma-separated numbers. A reminder is sent for each value.
						</p>
					</div>
				</div>

				<hr className="border-border/50" />

				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<Label className="font-medium" htmlFor="revision-enabled">
							Revision reminders
						</Label>
						<Switch
							checked={data.revision.enabled}
							id="revision-enabled"
							onCheckedChange={(checked) =>
								setData((prev) => ({
									...prev,
									revision: { ...prev.revision, enabled: checked === true },
								}))
							}
						/>
					</div>
					<p className="text-muted-foreground text-xs">
						Sent to authors asked to revise &amp; resubmit, repeated every few
						days until they upload a revision or the limit is reached.
					</p>
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="revision-interval">Interval (days)</Label>
							<Input
								disabled={!data.revision.enabled}
								id="revision-interval"
								min={1}
								onChange={(e) =>
									setData((prev) => ({
										...prev,
										revision: {
											...prev.revision,
											intervalDays: Number(e.target.value) || 1,
										},
									}))
								}
								type="number"
								value={data.revision.intervalDays}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="revision-max">Max reminders</Label>
							<Input
								disabled={!data.revision.enabled}
								id="revision-max"
								min={1}
								onChange={(e) =>
									setData((prev) => ({
										...prev,
										revision: {
											...prev.revision,
											maxCount: Number(e.target.value) || 1,
										},
									}))
								}
								type="number"
								value={data.revision.maxCount}
							/>
						</div>
					</div>
				</div>

				<hr className="border-border/50" />

				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<Label className="font-medium" htmlFor="deadline-enabled">
							Deadline reminders
						</Label>
						<Switch
							checked={data.deadline.enabled}
							id="deadline-enabled"
							onCheckedChange={(checked) =>
								setData((prev) => ({
									...prev,
									deadline: { ...prev.deadline, enabled: checked === true },
								}))
							}
						/>
					</div>
					<p className="text-muted-foreground text-xs">
						Sent to authors with an unsubmitted draft or an outstanding
						revision, counting down to the submission deadline.
					</p>
					<div className="space-y-2">
						<Label htmlFor="deadline-days">Days before deadline</Label>
						<Input
							disabled={!data.deadline.enabled}
							id="deadline-days"
							onChange={(e) => setDeadlineDaysText(e.target.value)}
							placeholder="e.g. 7, 3, 1"
							value={deadlineDaysText}
						/>
						<p className="text-muted-foreground text-xs">
							Comma-separated numbers. A reminder is sent for each value.
						</p>
					</div>
				</div>
			</div>

			<div className="mt-6 flex justify-end">
				<Button disabled={isSaving} onClick={handleSave}>
					{isSaving && <IconLoader2 className="mr-2 size-4 animate-spin" />}
					Save
				</Button>
			</div>
		</SettingsSection>
	);
}
