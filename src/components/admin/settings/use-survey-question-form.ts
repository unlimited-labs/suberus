import { useMemo } from "react";
import {
	type SurveyQuestionFormValues,
	surveyQuestionFormSchema,
} from "@/lib/validations/survey";
import { useAppForm } from "@/shared/hooks/use-app-form";
import type { SurveyQuestion } from "./survey-question-fields";

/** Map a persisted question (or nothing, for add) to form values. */
export function toSurveyQuestionFormValues(
	question?: SurveyQuestion | null,
): SurveyQuestionFormValues {
	return {
		label: question?.label ?? "",
		type: question?.type ?? "CHECKBOX",
		isRequired: question?.isRequired ?? false,
		options: Array.isArray(question?.options) ? question.options : [],
		showInUsersList: question?.showInUsersList ?? false,
		fieldName: question?.fieldName ?? "",
	};
}

/**
 * Form definition for the survey-question editor, shared by the add form and the
 * edit dialog. Keeps validation (Zod) and field wiring out of the components,
 * which stay pure presentation. `onSubmit` runs the server mutation; the second
 * argument exposes `reset` so the add form can clear itself after a success.
 */
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
