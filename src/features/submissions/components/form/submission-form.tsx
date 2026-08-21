import {
	IconDeviceFloppy,
	IconPresentation,
	IconSend,
	IconTags,
	IconUsers,
} from "@tabler/icons-react";
import { ExtractionOverlay } from "@/features/extraction/components/extraction-overlay";
import type { AvailableTrack } from "@/features/submissions/types";
import { AuthorsInput } from "@/shared/components/authors-input";
import { Button } from "@/shared/ui/button";
import { Field, FieldError } from "@/shared/ui/field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/ui/select";
import { FileUploadSection } from "./file-upload-section";
import { useSubmissionForm } from "./hooks/use-submission-form";
import { KeywordsInput } from "./keywords-input";
import { SubmissionContentSection } from "./submission-content-section";
import type {
	ActiveSubmissionType,
	SubmissionFormData,
	ValidationSettings,
} from "./submission-form-types";
import { SubmissionProgressSidebar } from "./submission-progress-sidebar";
import { SubmissionTypeSelector } from "./submission-type-selector";

export type { SubmissionFormData } from "./submission-form-types";

interface SubmissionFormProps {
	onSubmit: (data: SubmissionFormData) => Promise<void>;
	onSaveDraft?: (data: SubmissionFormData) => Promise<void>;
	initialData?: Partial<SubmissionFormData>;
	typeConfigs: ActiveSubmissionType[];
	validationSettings: ValidationSettings;
	guidelines?: string;
	extractionEnabled?: boolean;
	availableTracks: AvailableTrack[];
	/** A file is already attached server-side (editing a FILE draft) — relaxes the file requirement. */
	hasExistingFile?: boolean;
}

export function SubmissionForm(props: SubmissionFormProps) {
	const {
		onSaveDraft,
		initialData,
		typeConfigs,
		validationSettings,
		extractionEnabled,
	} = props;
	const {
		form,
		submissionAttempts,
		contentSchema,
		renderedGuidelines,
		selectedType,
		selectType,
		currentTypeConfig,
		activeTracks,
		isFileFormat,
		allowedExtensions,
		acceptString,
		maxFileSizeMb,
		progress,
		isExtracting,
		elapsedSeconds,
		handleFileWithExtraction,
		isSavingDraft,
		saveDraft,
	} = useSubmissionForm(props);

	return (
		<div className="mx-auto w-full max-w-7xl">
			<div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
				<div className="relative overflow-hidden rounded-2xl bg-card shadow-2xl">
					<ExtractionOverlay
						elapsedSeconds={elapsedSeconds}
						isExtracting={isExtracting}
					/>
					<div className="p-8">
						<div className="mb-8">
							<h1 className="text-2xl font-semibold tracking-tight">
								{initialData ? "Edit Submission" : "New Submission"}
							</h1>
							<p className="text-sm text-muted-foreground mt-1">
								{initialData
									? "Update your submission details"
									: "Submit your work for the conference"}
							</p>
						</div>

						<form
							className="space-y-6"
							onSubmit={(e) => {
								e.preventDefault();
								e.stopPropagation();
								void form.handleSubmit();
							}}
						>
							<SubmissionTypeSelector
								onSelect={selectType}
								selectedType={selectedType}
								typeConfigs={typeConfigs}
							/>

							{/* File upload */}
							{isFileFormat && extractionEnabled && (
								<>
									<div className="border-t" />
									<form.Field name="file">
										{(field) => (
											<FileUploadSection
												accept={acceptString}
												allowedExtensions={allowedExtensions}
												maxSize={maxFileSizeMb}
												onChange={(file) =>
													handleFileWithExtraction(file, field.handleChange)
												}
												value={field.state.value}
											/>
										)}
									</form.Field>
								</>
							)}

							<div className="border-t" />

							<SubmissionContentSection
								acceptString={acceptString}
								allowedExtensions={allowedExtensions}
								contentSchema={contentSchema}
								extractionEnabled={extractionEnabled}
								form={form}
								isFileFormat={isFileFormat}
								maxFileSizeMb={maxFileSizeMb}
								submissionAttempts={submissionAttempts}
								validationSettings={validationSettings}
							/>

							<div className="border-t" />

							<div className="space-y-4">
								<div className="flex items-center gap-3">
									<IconUsers className="size-5 text-muted-foreground" />
									<h2 className="text-lg font-semibold text-foreground">
										Authors
									</h2>
								</div>
								<form.Field name="authors">
									{(field) => {
										const hasError =
											(field.state.meta.isBlurred || submissionAttempts > 0) &&
											field.state.meta.errors.length > 0;
										return (
											<Field data-invalid={hasError}>
												<AuthorsInput
													onChange={field.handleChange}
													value={field.state.value}
												/>
												<FieldError
													errors={
														hasError ? field.state.meta.errors : undefined
													}
												/>
											</Field>
										);
									}}
								</form.Field>
							</div>

							{validationSettings.enableKeywords && (
								<>
									<div className="border-t" />

									<div className="space-y-4">
										<div className="flex items-center gap-3">
											<IconTags className="size-5 text-muted-foreground" />
											<h2 className="text-lg font-semibold text-foreground">
												Keywords
											</h2>
										</div>

										<form.Field name="keywords">
											{(field) => {
												const hasError =
													(field.state.meta.isBlurred ||
														submissionAttempts > 0) &&
													field.state.meta.errors.length > 0;
												return (
													<Field data-invalid={hasError}>
														<div className="rounded-lg border bg-muted/30 p-3">
															<KeywordsInput
																maxKeywords={validationSettings.maxKeywords}
																onChange={field.handleChange}
																value={field.state.value}
															/>
														</div>
														<FieldError
															errors={
																hasError ? field.state.meta.errors : undefined
															}
														/>
													</Field>
												);
											}}
										</form.Field>
									</div>
								</>
							)}

							{selectedType === "ABSTRACT" &&
								currentTypeConfig?.config.enableTrackSelection &&
								activeTracks.length > 0 && (
									<>
										<div className="border-t" />

										<div className="space-y-4">
											<div className="flex items-center gap-3">
												<IconPresentation className="size-5 text-muted-foreground" />
												<h2 className="text-lg font-semibold text-foreground">
													Preferred Track
												</h2>
											</div>

											<form.Field name="trackId">
												{(field) => (
													<Select
														items={[
															{ value: "none", label: "None" },
															...activeTracks.map((s) => ({
																value: s.id,
																label: s.name,
															})),
														]}
														onValueChange={(v) =>
															field.handleChange(v === "none" ? null : v)
														}
														value={field.state.value || "none"}
													>
														<SelectTrigger>
															<SelectValue placeholder="Select track (optional)" />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="none">None</SelectItem>
															{activeTracks.map((s) => (
																<SelectItem key={s.id} value={s.id}>
																	{s.name}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												)}
											</form.Field>
										</div>
									</>
								)}

							<div className="flex items-center justify-between pt-4 border-t gap-3">
								<p className="text-xs text-muted-foreground hidden sm:block">
									By submitting, you agree to the conference guidelines
								</p>
								<form.Subscribe selector={(s) => s.isSubmitting}>
									{(isSubmitting) => (
										<div className="flex gap-2 ml-auto">
											{onSaveDraft && (
												<Button
													className="gap-2"
													disabled={isSavingDraft || isSubmitting}
													onClick={saveDraft}
													type="button"
													variant="outline"
												>
													{isSavingDraft ? (
														<>
															<div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
															Saving...
														</>
													) : (
														<>
															<IconDeviceFloppy className="size-4" />
															Save Draft
														</>
													)}
												</Button>
											)}
											<Button
												className="gap-2 px-6"
												disabled={isSubmitting || isSavingDraft}
												type="submit"
											>
												{isSubmitting ? (
													<>
														<div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
														Submitting...
													</>
												) : (
													<>
														<IconSend className="size-4" />
														Submit
													</>
												)}
											</Button>
										</div>
									)}
								</form.Subscribe>
							</div>
						</form>
					</div>
				</div>

				<SubmissionProgressSidebar
					allowedExtensions={allowedExtensions}
					isFileFormat={isFileFormat}
					progress={progress}
					renderedGuidelines={renderedGuidelines}
					validationSettings={validationSettings}
				/>
			</div>
		</div>
	);
}
