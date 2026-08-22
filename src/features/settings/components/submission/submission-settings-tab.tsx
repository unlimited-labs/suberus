import { IconLoader2 } from "@tabler/icons-react";
import type { ExtractionSettings } from "@/features/extraction/api/extraction";
import { ExtractionModeSettings } from "@/features/extraction/components/extraction-mode-settings";
import type { SubmissionValidationSettings } from "@/features/settings/api/settings";
import type { AppSettingsMap } from "@/features/settings/types";
import { Button } from "@/shared/ui/button";
import { ContentValidationSection } from "./content-validation-section";
import { ReviewGuidelinesSection } from "./review-guidelines-section";
import { SubmissionGuidelinesSection } from "./submission-guidelines-section";
import { useSubmissionSettings } from "./use-submission-settings";

interface SubmissionSettingsTabProps {
	initialData: SubmissionValidationSettings;
	initialSubmissionGuidelines: string;
	initialReviewGuidelines: string;
	initialExtraction: ExtractionSettings;
	llmHealth: AppSettingsMap["SERVICE_HEALTH_LLM"];
	pdfApiHealth: AppSettingsMap["SERVICE_HEALTH_PDF_API"];
}

export function SubmissionSettingsTab({
	initialData,
	initialSubmissionGuidelines,
	initialReviewGuidelines,
	initialExtraction,
	llmHealth,
	pdfApiHealth,
}: SubmissionSettingsTabProps) {
	const {
		form,
		submissionGuidelines,
		setSubmissionGuidelines,
		reviewGuidelines,
		setReviewGuidelines,
		extractionEnabled,
		setExtractionEnabled,
		extractionHeuristic,
		setExtractionHeuristic,
		extractionAi,
		setExtractionAi,
	} = useSubmissionSettings({
		initialData,
		initialSubmissionGuidelines,
		initialReviewGuidelines,
		initialExtraction,
	});

	return (
		<div className="space-y-6">
			<ContentValidationSection form={form} />

			<SubmissionGuidelinesSection
				onChange={setSubmissionGuidelines}
				value={submissionGuidelines}
			/>

			<ReviewGuidelinesSection
				onChange={setReviewGuidelines}
				value={reviewGuidelines}
			/>

			<ExtractionModeSettings
				ai={extractionAi}
				enabled={extractionEnabled}
				heuristic={extractionHeuristic}
				llmHealth={llmHealth}
				onAiChange={setExtractionAi}
				onEnabledChange={setExtractionEnabled}
				onHeuristicChange={setExtractionHeuristic}
				pdfApiHealth={pdfApiHealth}
			/>

			<div className="flex justify-end border-t pt-6">
				<form.Subscribe selector={(s) => s.isSubmitting}>
					{(isSubmitting) => (
						<Button
							disabled={isSubmitting}
							onClick={() => void form.handleSubmit()}
						>
							{isSubmitting && (
								<IconLoader2 className="mr-2 size-4 animate-spin" />
							)}
							Save All Settings
						</Button>
					)}
				</form.Subscribe>
			</div>
		</div>
	);
}
