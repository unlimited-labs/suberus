import type { SubmissionTypeConfig } from "@/features/settings/types";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";
import type { SubmissionTypeConfigHandleChange } from "./use-submission-type-config";

interface TypeGeneralSectionProps {
	config: SubmissionTypeConfig;
	onChange: SubmissionTypeConfigHandleChange;
}

export function TypeGeneralSection({
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
					data-testid="settings-include-in-planner"
					checked={config.includeInPlanner}
					onCheckedChange={(checked) => onChange("includeInPlanner", checked)}
				/>
			</div>
		</>
	);
}
