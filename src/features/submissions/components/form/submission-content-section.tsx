import { IconWriting } from "@tabler/icons-react";
import type { z } from "zod";
import { isFieldErrorVisible } from "@/shared/hooks/use-field-error";
import { Field, FieldError, FieldLabel } from "@/shared/ui/field";
import { SectionCard } from "@/shared/ui/section-card";
import { FileUploadSection } from "./file-upload-section";
import type { SubmissionFormApi } from "./hooks/use-submission-form";
import type { ValidationSettings } from "./submission-form-types";

interface SubmissionContentSectionProps {
	form: SubmissionFormApi;
	isFileFormat: boolean;
	extractionEnabled?: boolean;
	validationSettings: ValidationSettings;
	contentSchema: z.ZodObject<{ content: z.ZodString }>;
	submissionAttempts: number;
	acceptString: string;
	allowedExtensions: string[];
	maxFileSizeMb: number;
}

export function SubmissionContentSection({
	form,
	isFileFormat,
	extractionEnabled,
	validationSettings,
	contentSchema,
	submissionAttempts,
	acceptString,
	allowedExtensions,
	maxFileSizeMb,
}: SubmissionContentSectionProps) {
	return (
		<SectionCard icon={IconWriting} title="Content">
			<div className="space-y-4">
				<form.AppField name="title">
					{(field) => (
						<field.InputField
							label="Title"
							placeholder={`Minimum ${validationSettings.minTitleLength} characters`}
						/>
					)}
				</form.AppField>

				{/* Content field always mounted to keep TanStack Form instance alive;
				   validators disabled for FILE format to prevent stale validation blocking submit */}
				<form.Field
					name="content"
					validators={
						isFileFormat
							? undefined
							: {
									onChange: contentSchema.shape.content,
									onSubmit: contentSchema.shape.content,
								}
					}
				>
					{(field) => {
						if (isFileFormat) return null;
						const hasError = isFieldErrorVisible(
							field.state.meta,
							submissionAttempts,
						);
						return (
							<Field data-invalid={hasError}>
								<FieldLabel htmlFor="content">Abstract</FieldLabel>
								<textarea
									aria-invalid={hasError}
									className="border-input text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 flex min-h-16 w-full resize-none rounded-lg border bg-transparent px-3 py-2 text-sm transition-colors focus-visible:ring-[3px] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-[3px]"
									id="content"
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									placeholder={`Minimum ${validationSettings.minAbstractLength} characters`}
									rows={8}
									value={field.state.value}
								/>
								<FieldError
									errors={hasError ? field.state.meta.errors : undefined}
								/>
							</Field>
						);
					}}
				</form.Field>

				{/* Show file dropzone in content section when extraction NOT enabled */}
				{isFileFormat && !extractionEnabled && (
					<form.Field name="file">
						{(field) => (
							<FileUploadSection
								accept={acceptString}
								allowedExtensions={allowedExtensions}
								maxSize={maxFileSizeMb}
								onChange={field.handleChange}
								value={field.state.value}
							/>
						)}
					</form.Field>
				)}
			</div>
		</SectionCard>
	);
}
