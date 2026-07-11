import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
	type ExtractionSettings,
	extractionAdminSettingsQueryOptions,
	updateExtractionSettingsFn,
} from "@/features/extraction/api/extraction";
import {
	reviewGuidelinesQueryOptions,
	type SubmissionValidationSettings,
	submissionGuidelinesQueryOptions,
	submissionValidationQueryOptions,
	updateReviewGuidelinesFn,
	updateSubmissionGuidelinesFn,
	updateSubmissionValidationSettingsFn,
} from "@/features/settings/api/settings";
import { getErrorMessage } from "@/shared/lib/error-message";

interface UseSubmissionSettingsArgs {
	initialData: SubmissionValidationSettings;
	initialSubmissionGuidelines: string;
	initialReviewGuidelines: string;
	initialExtraction: ExtractionSettings;
}

export function useSubmissionSettings({
	initialData,
	initialSubmissionGuidelines,
	initialReviewGuidelines,
	initialExtraction,
}: UseSubmissionSettingsArgs) {
	const queryClient = useQueryClient();
	const [data, setData] = useState(initialData);
	const [isSaving, setIsSaving] = useState(false);
	const [submissionGuidelines, setSubmissionGuidelines] = useState(
		initialSubmissionGuidelines,
	);
	const [reviewGuidelines, setReviewGuidelines] = useState(
		initialReviewGuidelines,
	);
	const [extractionEnabled, setExtractionEnabled] = useState(
		initialExtraction.enabled,
	);
	const [extractionHeuristic, setExtractionHeuristic] = useState(
		initialExtraction.heuristic,
	);
	const [extractionAi, setExtractionAi] = useState(initialExtraction.ai);

	const handleChange = <K extends keyof SubmissionValidationSettings>(
		field: K,
		value: SubmissionValidationSettings[K],
	) => {
		setData((prev) => ({ ...prev, [field]: value }));
	};

	const handleSave = async () => {
		setIsSaving(true);
		try {
			await Promise.all([
				updateSubmissionValidationSettingsFn({ data }),
				updateSubmissionGuidelinesFn({
					data: { value: submissionGuidelines },
				}),
				updateReviewGuidelinesFn({
					data: { value: reviewGuidelines },
				}),
				updateExtractionSettingsFn({
					data: {
						enabled: extractionEnabled,
						heuristic: extractionHeuristic,
						ai: extractionAi,
					},
				}),
			]);
			await Promise.all([
				queryClient.invalidateQueries({
					queryKey: submissionValidationQueryOptions().queryKey,
				}),
				queryClient.invalidateQueries({
					queryKey: submissionGuidelinesQueryOptions().queryKey,
				}),
				queryClient.invalidateQueries({
					queryKey: reviewGuidelinesQueryOptions().queryKey,
				}),
				queryClient.invalidateQueries({
					queryKey: extractionAdminSettingsQueryOptions().queryKey,
				}),
			]);
			toast.success("Submission settings saved");
		} catch (error) {
			toast.error(getErrorMessage(error, "Failed to save settings"));
		}
		setIsSaving(false);
	};

	return {
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
		handleSave,
	};
}

export type SubmissionSettingsHandleChange = <
	K extends keyof SubmissionValidationSettings,
>(
	field: K,
	value: SubmissionValidationSettings[K],
) => void;
