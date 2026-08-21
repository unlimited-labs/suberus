import { useSelector } from "@tanstack/react-store";
import type { SurveyQuestionType } from "@/generated/prisma/enums";
import { SurveyQuestionField } from "@/shared/components/survey-question-field";
import { useAppForm } from "@/shared/hooks/use-app-form";
import { isFieldErrorVisible } from "@/shared/hooks/use-field-error";
import { surveyAnswerRequiredError } from "@/shared/lib/validations/survey";
import { Field, FieldError } from "@/shared/ui/field";

interface SurveyQuestion {
	id: string;
	label: string;
	type: SurveyQuestionType;
	options: string[] | null;
	allowOther: boolean;
	isRequired: boolean;
}

interface SurveyAnswer {
	questionId: string;
	value: string;
}

interface SurveyAnswersFormProps {
	questions: SurveyQuestion[];
	initialAnswers: SurveyAnswer[];
	/** Persists the answers (server call + cache invalidation + toast). */
	onSave: (answers: SurveyAnswer[]) => Promise<void>;
	submitLabel?: string;
}

export function SurveyAnswersForm({
	questions,
	initialAnswers,
	onSave,
	submitLabel = "Save changes",
}: SurveyAnswersFormProps) {
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
			await onSave(answers);
		},
	});

	const submissionAttempts = useSelector(
		form.store,
		(s) => s.submissionAttempts,
	);

	if (questions.length === 0) {
		return null;
	}

	return (
		<form
			className="space-y-4"
			onSubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
				void form.handleSubmit();
			}}
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
							const hasError = isFieldErrorVisible(
								field.state.meta,
								submissionAttempts,
							);
							return (
								<Field data-invalid={hasError}>
									<SurveyQuestionField
										onChange={field.handleChange}
										question={question}
										value={field.state.value}
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
					<form.SubmitButton label={submitLabel} submittingLabel="Saving..." />
				</form.AppForm>
			</div>
		</form>
	);
}

function getDefaultValue(type: SurveyQuestionType): string {
	return type === "CHECKBOX" ? "false" : "";
}
