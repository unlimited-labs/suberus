import type { SubmissionTypeKey } from "@/features/settings/types";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";
import type { SubmissionTypeFormApi } from "./use-submission-type-config";

interface TypeFeatureTogglesSectionProps {
	typeKey: SubmissionTypeKey;
	form: SubmissionTypeFormApi;
}

export function TypeFeatureTogglesSection({
	typeKey,
	form,
}: TypeFeatureTogglesSectionProps) {
	return (
		<>
			<div className="flex items-center justify-between">
				<div className="space-y-0.5">
					<Label htmlFor="enableConfidenceLevel">Enable confidence level</Label>
					<p className="text-muted-foreground/70 text-xs italic">
						Reviewers rate their confidence (1-5) when submitting a review
					</p>
				</div>
				<form.Field name="enableConfidenceLevel">
					{(field) => (
						<Switch
							checked={field.state.value}
							id="enableConfidenceLevel"
							onCheckedChange={(checked) =>
								field.handleChange(checked === true)
							}
						/>
					)}
				</form.Field>
			</div>

			<div className="flex items-center justify-between">
				<div className="space-y-0.5">
					<Label htmlFor="enableReviewAttachment">
						Enable review attachment
					</Label>
					<p className="text-muted-foreground/70 text-xs italic">
						Reviewers can upload a PDF/DOCX file with their review
					</p>
				</div>
				<form.Field name="enableReviewAttachment">
					{(field) => (
						<Switch
							checked={field.state.value}
							id="enableReviewAttachment"
							onCheckedChange={(checked) =>
								field.handleChange(checked === true)
							}
						/>
					)}
				</form.Field>
			</div>

			{/* Track selection */}
			{typeKey === "SUBMISSION_TYPE_ORAL_PRESENTATION" && (
				<div className="flex items-center justify-between">
					<div className="space-y-0.5">
						<Label>Enable track selection</Label>
						<p className="text-muted-foreground/70 text-xs italic">
							Authors can select preferred track when submitting
						</p>
					</div>
					<form.Field name="enableTrackSelection">
						{(field) => (
							<Switch
								checked={field.state.value}
								id="enableTrackSelection"
								onCheckedChange={(checked) =>
									field.handleChange(checked === true)
								}
							/>
						)}
					</form.Field>
				</div>
			)}
		</>
	);
}
