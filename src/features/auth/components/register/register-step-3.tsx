import type {
	RegisterFormApi,
	RegisterSurveyQuestions,
	RegisterTosContent,
} from "@/features/auth/hooks/use-register-form";
import { SurveyQuestionField } from "@/features/survey/components/survey-question-field";
import { surveyAnswerRequiredError } from "@/features/survey/validations";
import { registerBase } from "@/features/auth/validations";
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
			{/* Dynamic survey questions */}
			{surveyQuestions.length > 0 && (
				<div className="space-y-3 rounded-lg border border-border/50 bg-muted/30 p-3">
					{surveyQuestions.map((question) => (
						<form.Field
							key={question.id}
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
			)}

			{/* Terms acceptance */}
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
								data-invalid={hasError}
								className="rounded-lg border border-primary/20 bg-primary/5 p-3"
							>
								<div className="flex items-start gap-2">
									<Checkbox
										id={field.name}
										checked={field.state.value}
										onCheckedChange={(checked) =>
											field.handleChange(checked === true)
										}
										className="mt-0.5"
									/>
									<FieldLabel
										htmlFor={field.name}
										className="cursor-pointer text-sm font-normal leading-snug"
									>
										I agree to the{" "}
										<button
											type="button"
											className="text-primary hover:underline"
											onClick={(e) => {
												e.preventDefault();
												onOpenTos();
											}}
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
