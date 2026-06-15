import type {
	SubmissionTypeConfig,
	SubmissionTypeKey,
} from "@/features/settings/types";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";
import type { SubmissionTypeConfigHandleChange } from "./use-submission-type-config";

interface TypeFeatureTogglesSectionProps {
	typeKey: SubmissionTypeKey;
	config: SubmissionTypeConfig;
	onChange: SubmissionTypeConfigHandleChange;
}

export function TypeFeatureTogglesSection({
	typeKey,
	config,
	onChange,
}: TypeFeatureTogglesSectionProps) {
	return (
		<>
			{/* Confidence Level */}
			<div className="flex items-center justify-between">
				<div className="space-y-0.5">
					<Label htmlFor="enableConfidenceLevel">Enable confidence level</Label>
					<p className="text-xs italic text-muted-foreground/70">
						Reviewers rate their confidence (1-5) when submitting a review
					</p>
				</div>
				<Switch
					id="enableConfidenceLevel"
					checked={config.enableConfidenceLevel}
					onCheckedChange={(checked) =>
						onChange("enableConfidenceLevel", checked)
					}
				/>
			</div>

			{/* Review Attachment */}
			<div className="flex items-center justify-between">
				<div className="space-y-0.5">
					<Label htmlFor="enableReviewAttachment">
						Enable review attachment
					</Label>
					<p className="text-xs italic text-muted-foreground/70">
						Reviewers can upload a PDF/DOCX file with their review
					</p>
				</div>
				<Switch
					id="enableReviewAttachment"
					checked={config.enableReviewAttachment}
					onCheckedChange={(checked) =>
						onChange("enableReviewAttachment", checked)
					}
				/>
			</div>

			{/* Track Selection (Oral Presentation only) */}
			{typeKey === "SUBMISSION_TYPE_ORAL_PRESENTATION" && (
				<div className="flex items-center justify-between">
					<div className="space-y-0.5">
						<Label>Enable track selection</Label>
						<p className="text-xs italic text-muted-foreground/70">
							Authors can select preferred track when submitting
						</p>
					</div>
					<Switch
						checked={config.enableTrackSelection}
						onCheckedChange={(checked) =>
							onChange("enableTrackSelection", checked)
						}
					/>
				</div>
			)}
		</>
	);
}
