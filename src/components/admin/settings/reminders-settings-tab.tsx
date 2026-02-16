import { IconBell, IconLoader2 } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";
import { SettingsSection } from "@/components/settings/settings-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { ReminderSettings } from "@/utils/settings.functions";
import { updateReminderSettingsFn } from "@/utils/settings.functions";

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
	const [data, setData] = useState(initialData);
	const [reviewerDaysText, setReviewerDaysText] = useState(
		formatDaysBefore(initialData.reviewer.daysBefore),
	);
	const [deadlineDaysText, setDeadlineDaysText] = useState(
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
			setData((prev) => ({
				...prev,
				reviewer: { ...prev.reviewer, daysBefore: reviewerDays },
				deadline: { ...prev.deadline, daysBefore: deadlineDays },
			}));
			toast.success("Reminder settings saved");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to save");
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<SettingsSection
			icon={IconBell}
			title="Reminders"
			description="Configure automatic email reminders"
		>
			<div className="space-y-6">
				{/* Reviewer Reminders */}
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<Label htmlFor="reviewer-enabled" className="font-medium">
							Reviewer reminders
						</Label>
						<Switch
							id="reviewer-enabled"
							checked={data.reviewer.enabled}
							onCheckedChange={(checked) =>
								setData((prev) => ({
									...prev,
									reviewer: { ...prev.reviewer, enabled: checked === true },
								}))
							}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="reviewer-days">Days before deadline</Label>
						<Input
							id="reviewer-days"
							value={reviewerDaysText}
							onChange={(e) => setReviewerDaysText(e.target.value)}
							placeholder="e.g. 7, 3, 1"
							disabled={!data.reviewer.enabled}
						/>
						<p className="text-xs text-muted-foreground">
							Comma-separated numbers. A reminder is sent for each value.
						</p>
					</div>
				</div>

				<hr className="border-border/50" />

				{/* Revision Reminders */}
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<Label htmlFor="revision-enabled" className="font-medium">
							Revision reminders
						</Label>
						<Switch
							id="revision-enabled"
							checked={data.revision.enabled}
							onCheckedChange={(checked) =>
								setData((prev) => ({
									...prev,
									revision: { ...prev.revision, enabled: checked === true },
								}))
							}
						/>
					</div>
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="revision-interval">Interval (days)</Label>
							<Input
								id="revision-interval"
								type="number"
								min={1}
								value={data.revision.intervalDays}
								onChange={(e) =>
									setData((prev) => ({
										...prev,
										revision: {
											...prev.revision,
											intervalDays: Number(e.target.value) || 1,
										},
									}))
								}
								disabled={!data.revision.enabled}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="revision-max">Max reminders</Label>
							<Input
								id="revision-max"
								type="number"
								min={1}
								value={data.revision.maxCount}
								onChange={(e) =>
									setData((prev) => ({
										...prev,
										revision: {
											...prev.revision,
											maxCount: Number(e.target.value) || 1,
										},
									}))
								}
								disabled={!data.revision.enabled}
							/>
						</div>
					</div>
				</div>

				<hr className="border-border/50" />

				{/* Deadline Reminders */}
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<Label htmlFor="deadline-enabled" className="font-medium">
							Deadline reminders
						</Label>
						<Switch
							id="deadline-enabled"
							checked={data.deadline.enabled}
							onCheckedChange={(checked) =>
								setData((prev) => ({
									...prev,
									deadline: { ...prev.deadline, enabled: checked === true },
								}))
							}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="deadline-days">Days before deadline</Label>
						<Input
							id="deadline-days"
							value={deadlineDaysText}
							onChange={(e) => setDeadlineDaysText(e.target.value)}
							placeholder="e.g. 7, 3, 1"
							disabled={!data.deadline.enabled}
						/>
						<p className="text-xs text-muted-foreground">
							Comma-separated numbers. A reminder is sent for each value.
						</p>
					</div>
				</div>
			</div>

			<div className="mt-6 flex justify-end">
				<Button onClick={handleSave} disabled={isSaving}>
					{isSaving && <IconLoader2 className="mr-2 size-4 animate-spin" />}
					Save
				</Button>
			</div>
		</SettingsSection>
	);
}
