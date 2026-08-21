import type {
	RegisterFormApi,
	RegisterSurveyQuestions,
	RegisterTosContent,
} from "@/features/auth/hooks/use-register-form";
import { registerBase } from "@/features/auth/validations";
import { SurveyQuestionField } from "@/shared/components/survey-question-field";
import { surveyAnswerRequiredError } from "@/shared/lib/validations/survey";
import { Checkbox } from "@/shared/ui/checkbox";
import { Field, FieldError, FieldLabel } from "@/shared/ui/field";

interface RegisterStep3Props {
	form: RegisterFormApi;
	surveyQuestions: RegisterSurveyQuestions;
	tosContent: RegisterTosContent;
	onOpenTos: () => void;
}

export function RegisterStep3({
	form,
	surveyQuestions,
	tosContent,
	onOpenTos,
}: RegisterStep3Props) {
	return (
		<div className="animate-in fade-in slide-in-from-right-4 space-y-3 duration-300">
			{surveyQuestions.length > 0 && (
				<div className="space-y-3 rounded-lg border border-border/50 bg-muted/30 p-3">
					{surveyQuestions.map((question) => (
						<form.Field
							key={question.id}
							// SAFETY: the template literal already has that form; TS widens it to string.
							name={`surveyAnswers.${question.id}` as `surveyAnswers.${string}`}
							validators={{
								onChange: ({ value }) =>
									surveyAnswerRequiredError(question, value),
							}}
						>
							{(field) => {
								const hasError =
									field.state.meta.isBlurred &&
									field.state.meta.errors.length > 0;
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
			)}

			{tosContent && (
				<form.Field
					name="acceptTerms"
					validators={{ onChange: registerBase.shape.acceptTerms }}
				>
					{(field) => {
						const hasError =
							field.state.meta.isBlurred && field.state.meta.errors.length > 0;
						return (
							<Field
								className="rounded-lg border border-primary/20 bg-primary/5 p-3"
								data-invalid={hasError}
							>
								<div className="flex items-start gap-2">
									<Checkbox
										checked={field.state.value}
										className="mt-0.5"
										id={field.name}
										onCheckedChange={(checked) =>
											field.handleChange(checked === true)
										}
									/>
									<FieldLabel
										className="cursor-pointer text-sm font-normal leading-snug"
										htmlFor={field.name}
									>
										I agree to the{" "}
										<button
											className="text-primary hover:underline"
											onClick={(e) => {
												e.preventDefault();
												onOpenTos();
											}}
											type="button"
										>
											Terms of Service
										</button>{" "}
										*
									</FieldLabel>
								</div>
								<FieldError
									errors={hasError ? field.state.meta.errors : undefined}
								/>
							</Field>
						);
					}}
				</form.Field>
			)}
		</div>
	);
}
