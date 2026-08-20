import type { SubmissionTypeConfig } from "@/features/settings/types";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/ui/select";
import { Switch } from "@/shared/ui/switch";
import type { SubmissionTypeConfigHandleChange } from "./use-submission-type-config";

const reviewModeLabels = {
	OPEN: "Open",
	SINGLE_BLIND: "Single-blind",
	DOUBLE_BLIND: "Double-blind",
} as const;

// SAFETY: Object.keys over this const map returns exactly its declared keys.
const REVIEW_MODES = Object.keys(
	reviewModeLabels,
) as (keyof typeof reviewModeLabels)[];

interface TypeReviewSectionProps {
	config: SubmissionTypeConfig;
	onChange: SubmissionTypeConfigHandleChange;
}

export function TypeReviewSection({
	config,
	onChange,
}: TypeReviewSectionProps) {
	return (
		<>
			<div className="space-y-2">
				<Label htmlFor="required-reviewers">Required reviewers</Label>
				<Input
					id="required-reviewers"
					type="number"
					min={1}
					max={10}
					value={config.requiredReviewers}
					onChange={(e) =>
						onChange("requiredReviewers", parseInt(e.target.value, 10) || 1)
					}
				/>
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				<div className="space-y-2">
					<Label>Review mode</Label>
					<Select
						items={Object.entries(reviewModeLabels).map(([value, label]) => ({
							value,
							label,
						}))}
						value={config.reviewMode}
						onValueChange={(value) => {
							const found = REVIEW_MODES.find((m) => m === value);
							if (found) onChange("reviewMode", found);
						}}
					>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{Object.entries(reviewModeLabels).map(([value, label]) => (
								<SelectItem key={value} value={value}>
									{label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="space-y-2">
					<Label>Review deadline (days)</Label>
					<Input
						type="number"
						min={1}
						max={90}
						value={config.reviewDeadlineDays}
						onChange={(e) =>
							onChange("reviewDeadlineDays", parseInt(e.target.value, 10) || 7)
						}
					/>
				</div>
			</div>

			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<div className="space-y-0.5">
						<Label>Requires editor decision</Label>
						<p className="text-xs italic text-muted-foreground/70">
							Editor makes the final accept/reject decision. When off, the
							reviewer's recommendation is applied automatically.
						</p>
					</div>
					<Switch
						checked={config.requiresEditorDecision}
						onCheckedChange={(checked) =>
							onChange("requiresEditorDecision", checked)
						}
					/>
				</div>
			</div>
		</>
	);
}
