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
import {
	type SubmissionValidationFormValues,
	submissionValidationFormSchema,
} from "@/features/settings/validations";
import { useAppForm } from "@/shared/hooks/use-app-form";
import { getErrorMessage } from "@/shared/lib/error-message";

interface UseSubmissionSettingsArgs {
	initialData: SubmissionValidationSettings;
	initialSubmissionGuidelines: string;
	initialReviewGuidelines: string;
	initialExtraction: ExtractionSettings;
}

function toFormValues(
	data: SubmissionValidationSettings,
): SubmissionValidationFormValues {
	return {
		minTitleLength: String(data.minTitleLength),
		maxTitleLength: String(data.maxTitleLength),
		minAbstractLength: String(data.minAbstractLength),
		maxAbstractLength: String(data.maxAbstractLength),
		minKeywords: String(data.minKeywords),
		maxKeywords: String(data.maxKeywords),
		enableKeywords: data.enableKeywords,
	};
}

export function useSubmissionSettings({
	initialData,
	initialSubmissionGuidelines,
	initialReviewGuidelines,
	initialExtraction,
}: UseSubmissionSettingsArgs) {
	const queryClient = useQueryClient();
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

	const form = useAppForm({
		defaultValues: toFormValues(initialData),
		validators: {
			onChange: submissionValidationFormSchema,
			onSubmit: submissionValidationFormSchema,
		},
		onSubmit: async ({ value }) => {
			const validation = submissionValidationFormSchema.parse(value);
			try {
				await Promise.all([
					updateSubmissionValidationSettingsFn({ data: validation }),
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
		},
	});

	return {
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
	};
}

export type SubmissionSettingsFormApi = ReturnType<
	typeof useSubmissionSettings
>["form"];
