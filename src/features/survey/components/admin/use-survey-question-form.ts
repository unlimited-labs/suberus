import { useMemo } from "react";
import {
	type SurveyQuestionFormValues,
	surveyQuestionFormSchema,
} from "@/features/survey/validations";
import { useAppForm } from "@/shared/hooks/use-app-form";
import type { SurveyQuestion } from "./survey-question-fields";

export function toSurveyQuestionFormValues(
	question?: SurveyQuestion | null,
): SurveyQuestionFormValues {
	return {
		label: question?.label ?? "",
		type: question?.type ?? "CHECKBOX",
		audience: question?.audience ?? "ALL",
		isRequired: question?.isRequired ?? false,
		options: Array.isArray(question?.options) ? question.options : [],
		allowOther: question?.allowOther ?? false,
		showInUsersList: question?.showInUsersList ?? false,
		fieldName: question?.fieldName ?? "",
	};
}

export function useSurveyQuestionForm(
	initial: SurveyQuestion | null | undefined,
	onSubmit: (
		values: SurveyQuestionFormValues,
		formApi: { reset: () => void },
	) => Promise<void>,
) {
	// Stable identity: a fresh defaultValues object (with a fresh options array)
	// on every render makes the form's per-render update() churn the field tree
	// whenever the parent re-renders, remounting the option inputs mid-edit.
	const defaultValues = useMemo(
		() => toSurveyQuestionFormValues(initial),
		[initial],
	);
	return useAppForm({
		defaultValues,
		validators: {
			onChange: surveyQuestionFormSchema,
			onSubmit: surveyQuestionFormSchema,
		},
		onSubmit: async ({ value, formApi }) => {
			await onSubmit(value, formApi);
		},
	});
}
