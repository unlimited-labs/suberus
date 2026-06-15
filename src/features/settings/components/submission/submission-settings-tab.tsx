import { IconLoader2 } from "@tabler/icons-react";
import type { ExtractionSettings } from "@/features/extraction/api/extraction";
import { ExtractionModeSettings } from "@/features/extraction/components/extraction-mode-settings";
import type { SubmissionValidationSettings } from "@/features/settings/api/settings";
import type { AppSettingsMap } from "@/features/settings/types";
import { Button } from "@/shared/ui/button";
import { ContentValidationSection } from "./content-validation-section";
import { FilesSection } from "./files-section";
import { ReviewGuidelinesSection } from "./review-guidelines-section";
import { SubmissionGuidelinesSection } from "./submission-guidelines-section";
import { useSubmissionSettings } from "./use-submission-settings";

interface SubmissionSettingsTabProps {
	initialData: SubmissionValidationSettings;
	initialSubmissionGuidelines: string;
	initialReviewGuidelines: string;
	initialExtraction: ExtractionSettings;
	llmHealth: AppSettingsMap["SERVICE_HEALTH_LLM"];
	doclingHealth: AppSettingsMap["SERVICE_HEALTH_DOCLING"];
}

export function SubmissionSettingsTab({
	initialData,
	initialSubmissionGuidelines,
	initialReviewGuidelines,
	initialExtraction,
	llmHealth,
	doclingHealth,
}: SubmissionSettingsTabProps) {
	const {
		data,
		isSaving,
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
		handleChange,
		toggleFileType,
		handleSave,
	} = useSubmissionSettings({
		initialData,
		initialSubmissionGuidelines,
		initialReviewGuidelines,
		initialExtraction,
	});

	return (
		<div className="space-y-6">
			<ContentValidationSection data={data} onChange={handleChange} />

			<FilesSection
				data={data}
				onChange={handleChange}
				onToggleFileType={toggleFileType}
			/>

			<SubmissionGuidelinesSection
				value={submissionGuidelines}
				onChange={setSubmissionGuidelines}
			/>

			<ReviewGuidelinesSection
				value={reviewGuidelines}
				onChange={setReviewGuidelines}
			/>

			<ExtractionModeSettings
				enabled={extractionEnabled}
				onEnabledChange={setExtractionEnabled}
				heuristic={extractionHeuristic}
				onHeuristicChange={setExtractionHeuristic}
				ai={extractionAi}
				onAiChange={setExtractionAi}
				llmHealth={llmHealth}
				doclingHealth={doclingHealth}
			/>

			<div className="flex justify-end border-t pt-6">
				<Button onClick={handleSave} disabled={isSaving}>
					{isSaving && <IconLoader2 className="mr-2 size-4 animate-spin" />}
					Save All Settings
				</Button>
			</div>
		</div>
	);
}
