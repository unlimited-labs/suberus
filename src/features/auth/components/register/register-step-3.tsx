import type {
	RegisterFormApi,
	RegisterSurveyQuestions,
	RegisterTosContent,
} from "@/features/auth/hooks/use-register-form";
import { registerBase } from "@/features/auth/validations";
import { SurveyQuestionField } from "@/shared/components/survey-question-field";
import { isFieldErrorVisible } from "@/shared/hooks/use-field-error";
import { surveyAnswerRequiredError } from "@/shared/lib/validations/survey";
import { Checkbox } from "@/shared/ui/checkbox";
import { Field, FieldError, FieldLabel } from "@/shared/ui/field";

interface RegisterStep3Props {
	form: RegisterFormApi;
	surveyQuestions: RegisterSurveyQuestions;
	tosContent: RegisterTosContent;
	contactConsentEnabled: boolean;
	onOpenTos: () => void;
}

export function RegisterStep3({
	form,
	surveyQuestions,
	tosContent,
	contactConsentEnabled,
	onOpenTos,
}: RegisterStep3Props) {
	return (
		<div className="animate-in fade-in slide-in-from-right-4 space-y-3 duration-300">
			{surveyQuestions.length > 0 && (
				<div className="border-border/50 bg-muted/30 space-y-3 rounded-lg border p-3">
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
								const hasError = isFieldErrorVisible(field.state.meta);
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

			{contactConsentEnabled && (
				<form.Field name="contactConsent">
					{(field) => (
						<Field className="border-border/50 rounded-lg border p-3">
							<div className="flex items-start gap-2">
								<Checkbox
									checked={field.state.value}
									className="mt-0.5"
									data-testid="contact-consent-checkbox"
									id={field.name}
									onCheckedChange={(checked) =>
										field.handleChange(checked === true)
									}
								/>
								<FieldLabel
									className="cursor-pointer text-sm leading-snug font-normal"
									htmlFor={field.name}
								>
									I consent to my name, affiliation and e-mail address being
									included in the participant list made available to the other
									participants of the event, for networking purposes.
								</FieldLabel>
							</div>
						</Field>
					)}
				</form.Field>
			)}

			{tosContent && (
				<form.Field
					name="acceptTerms"
					validators={{ onChange: registerBase.shape.acceptTerms }}
				>
					{(field) => {
						const hasError = isFieldErrorVisible(field.state.meta);
						return (
							<Field
								className="border-primary/20 bg-primary/5 rounded-lg border p-3"
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
										className="cursor-pointer text-sm leading-snug font-normal"
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
