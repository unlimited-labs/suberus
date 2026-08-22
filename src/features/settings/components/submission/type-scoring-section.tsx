import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";
import { ScoringCriteriaSection } from "./scoring-criteria-section";
import type { SubmissionTypeFormApi } from "./use-submission-type-config";

interface TypeScoringSectionProps {
	form: SubmissionTypeFormApi;
}

export function TypeScoringSection({ form }: TypeScoringSectionProps) {
	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div className="space-y-0.5">
					<Label>Enable scoring</Label>
					<p className="text-muted-foreground/70 text-xs italic">
						Reviewers score based on criteria
					</p>
				</div>
				<form.Field name="enableScoring">
					{(field) => (
						<Switch
							checked={field.state.value}
							onCheckedChange={(checked) =>
								field.handleChange(checked === true)
							}
						/>
					)}
				</form.Field>
			</div>
			<form.Subscribe selector={(s) => s.values.enableScoring}>
				{(enabled) => (enabled ? <ScoringCriteriaSection form={form} /> : null)}
			</form.Subscribe>
		</div>
	);
}
