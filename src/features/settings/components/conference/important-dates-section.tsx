import { IconCalendar } from "@tabler/icons-react";
import type { ConferenceSettings } from "@/features/settings/api/settings";
import { SettingsSaveButton } from "@/features/settings/components/settings-save-button";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";
import type {
	ConferenceSettingsHandleChange,
	ConferenceSettingsHandleToggle,
} from "./use-conference-settings";

interface ImportantDatesSectionProps {
	data: ConferenceSettings;
	onChange: ConferenceSettingsHandleChange;
	onToggle: ConferenceSettingsHandleToggle;
	onSave: () => void;
	isSaving: boolean;
}

export function ImportantDatesSection({
	data,
	onChange,
	onToggle,
	onSave,
	isSaving,
}: ImportantDatesSectionProps) {
	return (
		<SettingsSection
			delay={100}
			description="Conference, submission and review deadlines"
			icon={IconCalendar}
			title="Important Dates"
		>
			<div className="grid gap-4 sm:grid-cols-2">
				<div className="space-y-2">
					<Label htmlFor="conferenceStartDate">Conference Start</Label>
					<Input
						id="conferenceStartDate"
						onChange={(e) => onChange("conferenceStartDate", e.target.value)}
						type="date"
						value={data.conferenceStartDate}
					/>
					<p className="text-xs text-muted-foreground">
						First day of the conference
					</p>
				</div>
				<div className="space-y-2">
					<Label htmlFor="conferenceEndDate">Conference End</Label>
					<Input
						id="conferenceEndDate"
						onChange={(e) => onChange("conferenceEndDate", e.target.value)}
						type="date"
						value={data.conferenceEndDate}
					/>
					<p className="text-xs text-muted-foreground">
						Last day of the conference
					</p>
				</div>
				<div className="space-y-2">
					<Label htmlFor="submissionDeadline">Submission Deadline</Label>
					<Input
						id="submissionDeadline"
						onChange={(e) => onChange("submissionDeadline", e.target.value)}
						type="date"
						value={data.submissionDeadline}
					/>
					<p className="text-xs text-muted-foreground">
						After this date the system automatically stops accepting new
						submissions. Leave empty for no limit.
					</p>
				</div>
				<div className="space-y-2">
					<Label htmlFor="registrationDeadline">Registration Deadline</Label>
					<Input
						id="registrationDeadline"
						onChange={(e) => onChange("registrationDeadline", e.target.value)}
						type="date"
						value={data.registrationDeadline}
					/>
					<p className="text-xs text-muted-foreground">
						After this date public registration is blocked. Invitation-based
						registration still works. Leave empty for no limit.
					</p>
				</div>
				<div className="flex items-center justify-between sm:col-span-2 rounded-lg border border-border/50 p-3">
					<div>
						<Label htmlFor="submissionsLocked">Close submissions</Label>
						<p className="text-xs text-muted-foreground">
							Immediately block all new submissions, regardless of the deadline
						</p>
					</div>
					<Switch
						checked={data.submissionsLocked}
						id="submissionsLocked"
						onCheckedChange={(checked) =>
							onToggle("submissionsLocked", checked)
						}
					/>
				</div>
				<div className="flex items-center justify-between sm:col-span-2 rounded-lg border border-border/50 p-3">
					<div>
						<Label htmlFor="registrationLocked">Close registration</Label>
						<p className="text-xs text-muted-foreground">
							Immediately block public registration, regardless of the deadline.
							Invited users can still register.
						</p>
					</div>
					<Switch
						checked={data.registrationLocked}
						id="registrationLocked"
						onCheckedChange={(checked) =>
							onToggle("registrationLocked", checked)
						}
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="reviewDeadline">Review Deadline</Label>
					<Input
						id="reviewDeadline"
						onChange={(e) => onChange("reviewDeadline", e.target.value)}
						type="date"
						value={data.reviewDeadline}
					/>
					<p className="text-xs text-muted-foreground">
						Deadline for reviewers to submit their reviews
					</p>
				</div>
				<div className="space-y-2">
					<Label htmlFor="notificationDate">Notification Date</Label>
					<Input
						id="notificationDate"
						onChange={(e) => onChange("notificationDate", e.target.value)}
						type="date"
						value={data.notificationDate}
					/>
					<p className="text-xs text-muted-foreground">
						Date when authors are notified of the decision
					</p>
				</div>
			</div>
			<SettingsSaveButton isSaving={isSaving} onSave={onSave} />
		</SettingsSection>
	);
}
