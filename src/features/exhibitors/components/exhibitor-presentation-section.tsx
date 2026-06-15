import { IconPresentation } from "@tabler/icons-react";
import { AuthorsInput } from "@/shared/components/authors-input";
import { Field, FieldError } from "@/shared/ui/field";
import type { ExhibitorApplicationFormApi } from "./use-exhibitor-application-form";

interface ExhibitorPresentationSectionProps {
	form: ExhibitorApplicationFormApi;
	addPresentation: boolean;
	submissionAttempts: number;
}

export function ExhibitorPresentationSection({
	form,
	addPresentation,
	submissionAttempts,
}: ExhibitorPresentationSectionProps) {
	return (
		<div className="space-y-4">
			<div className="flex items-center gap-3">
				<IconPresentation className="size-5 text-muted-foreground" />
				<h2 className="text-lg font-semibold text-foreground">Presentation</h2>
			</div>

			<form.AppField name="addPresentation">
				{(field) => (
					<field.SwitchField
						label="Submit a company presentation"
						testId="exhibitor-add-presentation"
					/>
				)}
			</form.AppField>

			{addPresentation && (
				<div className="space-y-4">
					<form.AppField name="presentationTitle">
						{(field) => (
							<field.InputField
								label="Title"
								testId="exhibitor-presentation-title"
							/>
						)}
					</form.AppField>

					<form.AppField name="presentationContent">
						{(field) => (
							<field.TextareaField
								label="Abstract"
								rows={6}
								testId="exhibitor-presentation-content"
							/>
						)}
					</form.AppField>

					<form.Field name="authors">
						{(field) => {
							const hasError =
								(field.state.meta.isBlurred || submissionAttempts > 0) &&
								field.state.meta.errors.length > 0;
							return (
								<Field data-invalid={hasError}>
									<AuthorsInput
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
				</div>
			)}
		</div>
	);
}
