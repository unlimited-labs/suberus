import { IconWriting } from "@tabler/icons-react";
import type { z } from "zod";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";

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
}: SubmissionContentSectionProps) {
	return (
		<div className="space-y-4">
			<div className="flex items-center gap-3">
				<IconWriting className="size-5 text-muted-foreground" />
				<h2 className="text-lg font-semibold text-foreground">Content</h2>
			</div>

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
						const hasError =
							(field.state.meta.isBlurred || submissionAttempts > 0) &&
							field.state.meta.errors.length > 0;
						return (
							<Field data-invalid={hasError}>
								<FieldLabel htmlFor="content">Abstract</FieldLabel>
								<textarea
									id="content"
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									rows={8}
									aria-invalid={hasError}
									placeholder={`Minimum ${validationSettings.minAbstractLength} characters`}
									className="flex min-h-16 w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 aria-invalid:ring-[3px]"
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
								value={field.state.value}
								onChange={field.handleChange}
								accept={acceptString}
								maxSize={validationSettings.maxFileSize}
								allowedExtensions={allowedExtensions}
							/>
						)}
					</form.Field>
				)}
			</div>
		</div>
	);
}
