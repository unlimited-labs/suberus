import type {
	SubmissionTypeConfig,
	SubmissionTypeKey,
} from "@/features/settings/types";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";
import type { SubmissionTypeConfigHandleChange } from "./use-submission-type-config";

interface TypeGeneralSectionProps {
	typeKey: SubmissionTypeKey;
	config: SubmissionTypeConfig;
	onChange: SubmissionTypeConfigHandleChange;
}

export function TypeGeneralSection({
	typeKey,
	config,
	onChange,
}: TypeGeneralSectionProps) {
	return (
		<>
			<div className="flex items-center justify-between">
				<div className="space-y-0.5">
					<Label>Active</Label>
					<p className="text-xs italic text-muted-foreground/70">
						Type available for selection when submitting
					</p>
				</div>
				<Switch
					checked={config.isActive}
					onCheckedChange={(checked) => onChange("isActive", checked)}
				/>
			</div>

			<div className="flex items-center justify-between">
				<div className="space-y-0.5">
					<Label>Include in program planner</Label>
					<p className="text-xs italic text-muted-foreground/70">
						Accepted submissions of this type appear in the program planner
					</p>
				</div>
				<Switch
					checked={config.includeInPlanner}
					data-testid="settings-include-in-planner"
					onCheckedChange={(checked) => onChange("includeInPlanner", checked)}
				/>
			</div>

			{typeKey !== "SUBMISSION_TYPE_EXHIBITOR" && (
				<div className="space-y-2">
					<Label>Max submissions per user</Label>
					<Input
						data-testid="settings-max-submissions-per-user"
						max={1000}
						min={0}
						onChange={(e) =>
							onChange(
								"maxSubmissionsPerUser",
								parseInt(e.target.value, 10) || 0,
							)
						}
						type="number"
						value={config.maxSubmissionsPerUser}
					/>
					<p className="text-xs italic text-muted-foreground/70">
						0 = unlimited. Counts only submissions a user owns (co-authorship
						doesn't count); drafts, withdrawn and rejected don't count.
					</p>
				</div>
			)}
		</>
	);
}
