import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	saveUserSurveyAnswersFn,
	userSurveyAnswersQueryOptions,
} from "@/features/survey/api/survey";
import type { SurveyQuestionType } from "@/generated/prisma/enums";
import { SurveyQuestionField } from "@/shared/components/survey-question-field";
import { useAppForm } from "@/shared/hooks/use-app-form";
import { surveyAnswerRequiredError } from "@/shared/lib/validations/survey";
import { Field, FieldError } from "@/shared/ui/field";

interface SurveyQuestion {
	id: string;
	label: string;
	type: SurveyQuestionType;
	options: string[] | null;
	isRequired: boolean;
}

interface SurveyAnswer {
	questionId: string;
	value: string;
}

interface SurveySectionProps {
	questions: SurveyQuestion[];
	initialAnswers: SurveyAnswer[];
}

export function SurveySection({
	questions,
	initialAnswers,
}: SurveySectionProps) {
	const queryClient = useQueryClient();
	const answerMap = new Map(initialAnswers.map((a) => [a.questionId, a.value]));

	const defaultValues: Record<string, string> = {};
	for (const q of questions) {
		defaultValues[q.id] = answerMap.get(q.id) ?? getDefaultValue(q.type);
	}

	const form = useAppForm({
		defaultValues,
		onSubmit: async ({ value }) => {
			const answers = Object.entries(value).map(([questionId, val]) => ({
				questionId,
				value: val,
			}));
			try {
				await saveUserSurveyAnswersFn({ data: { answers } });
				await queryClient.invalidateQueries({
					queryKey: userSurveyAnswersQueryOptions().queryKey,
				});
				toast.success("Survey preferences saved");
			} catch {
				toast.error("Failed to save survey preferences");
			}
		},
	});

	if (questions.length === 0) {
		return null;
	}

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
				// Reveal required-field errors on submit (errors gate on isBlurred).
				for (const question of questions) {
					form.setFieldMeta(question.id, (prev) => ({
						...prev,
						isBlurred: true,
					}));
				}
				void form.handleSubmit();
			}}
			className="space-y-4"
		>
			<div className="space-y-3">
				{questions.map((question) => (
					<form.Field
						key={question.id}
						name={question.id}
						validators={{
							onChange: ({ value }) =>
								surveyAnswerRequiredError(question, value),
							onSubmit: ({ value }) =>
								surveyAnswerRequiredError(question, value),
						}}
					>
						{(field) => {
							const hasError =
								(field.state.meta.isBlurred ||
									field.form.state.submissionAttempts > 0) &&
								field.state.meta.errors.length > 0;
							return (
								<Field data-invalid={hasError}>
									<SurveyQuestionField
										question={question}
										value={field.state.value}
										onChange={field.handleChange}
									/>
									<FieldError
										errors={hasError ? field.state.meta.errors : undefined}
									/>
								</Field>
							);
						}}
					</form.Field>
				))}
			</div>

			<div className="flex justify-end pt-2">
				<form.AppForm>
					<form.SubmitButton label="Save changes" submittingLabel="Saving..." />
				</form.AppForm>
			</div>
		</form>
	);
}

function getDefaultValue(type: SurveyQuestionType): string {
	return type === "CHECKBOX" ? "false" : "";
}
