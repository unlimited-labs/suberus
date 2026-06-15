import type { SubmissionTypeConfig } from "@/features/settings/types";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";
import { ScoringCriteriaSection } from "./scoring-criteria-section";
import type { SubmissionTypeConfigHandleChange } from "./use-submission-type-config";

interface TypeScoringSectionProps {
	config: SubmissionTypeConfig;
	onChange: SubmissionTypeConfigHandleChange;
	onUpdateCriterion: (
		index: number,
		field: "name" | "description",
		value: string,
	) => void;
	onRemoveCriterion: (index: number) => void;
	onAddCriterion: () => void;
}

export function TypeScoringSection({
	config,
	onChange,
	onUpdateCriterion,
	onRemoveCriterion,
	onAddCriterion,
}: TypeScoringSectionProps) {
	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div className="space-y-0.5">
					<Label>Enable scoring</Label>
					<p className="text-xs italic text-muted-foreground/70">
						Reviewers score based on criteria
					</p>
				</div>
				<Switch
					checked={config.enableScoring}
					onCheckedChange={(checked) => onChange("enableScoring", checked)}
				/>
			</div>
			{config.enableScoring && (
				<ScoringCriteriaSection
					criteria={config.scoringCriteria}
					onUpdate={onUpdateCriterion}
					onRemove={onRemoveCriterion}
					onAdd={onAddCriterion}
				/>
			)}
		</div>
	);
}
