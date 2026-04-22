import {
	IconCategory,
	IconCircle,
	IconCircleCheck,
	IconDeviceFloppy,
	IconFile,
	IconFileText,
	IconInfoCircle,
	IconPresentation,
	IconSend,
	IconSparkles,
	IconTags,
	IconUsers,
	IconWriting,
} from "@tabler/icons-react";
import { useStore } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Markdown } from "@/components/ui/markdown";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useAppForm } from "@/hooks/use-app-form";
import { useSession } from "@/hooks/use-session";
import { submitForm } from "@/lib/form-utils";
import type { SubmissionTypeConfig } from "@/lib/settings/types";
import { cn } from "@/lib/utils";
import { getAffiliationById } from "@/server-fns/affiliations";
import { activeTracksQueryOptions } from "@/server-fns/tracks";
import { type Author, AuthorsInput } from "./authors-input";
import { ExtractionOverlay } from "./extraction-overlay";
import { FileUploadSection } from "./file-upload-section";
import { KeywordsInput } from "./keywords-input";
import { useDocumentExtraction } from "./use-document-extraction";

/** Active submission type from settings */
export interface ActiveSubmissionType {
	type: "ABSTRACT" | "POSTER" | "FULL_PAPER";
	label: string;
	config: SubmissionTypeConfig;
}

const typeIcons = {
	ABSTRACT: IconFileText,
	POSTER: IconSparkles,
	FULL_PAPER: IconFile,
} as const;

/** Validation settings from admin panel */
export interface ValidationSettings {
	minTitleLength: number;
	maxTitleLength: number;
	minAbstractLength: number;
	maxAbstractLength: number;
	minKeywords: number;
	maxKeywords: number;
	maxFileSize: number;
	allowedFileTypes: string[];
	enableKeywords: boolean;
}

interface SubmissionFormProps {
	onSubmit: (data: SubmissionFormData) => Promise<void>;
	onSaveDraft?: (data: SubmissionFormData) => Promise<void>;
	initialData?: Partial<SubmissionFormData>;
	typeConfigs: ActiveSubmissionType[];
	validationSettings: ValidationSettings;
	guidelines?: string;
	extractionEnabled?: boolean;
}

export interface SubmissionFormData {
	type: "ABSTRACT" | "POSTER" | "FULL_PAPER";
	title: string;
	content: string;
	authors: Author[];
	keywords: string[];
	file: File | null;
	contentFormat: "TEXT" | "FILE";
	trackId: string | null;
}

/** Substitute {{placeholder}} values in guidelines text */
function substituteGuidelines(
	text: string,
	settings: ValidationSettings,
): string {
	return text
		.replace(/\{\{minTitleLength\}\}/g, String(settings.minTitleLength))
		.replace(/\{\{maxTitleLength\}\}/g, String(settings.maxTitleLength))
		.replace(/\{\{minAbstractLength\}\}/g, String(settings.minAbstractLength))
		.replace(/\{\{maxAbstractLength\}\}/g, String(settings.maxAbstractLength))
		.replace(/\{\{minKeywords\}\}/g, String(settings.minKeywords))
		.replace(/\{\{maxKeywords\}\}/g, String(settings.maxKeywords));
}

function createSubmissionSchema(settings: ValidationSettings) {
	return z.object({
		type: z.enum(["ABSTRACT", "POSTER", "FULL_PAPER"]),
		title: z
			.string()
			.min(
				settings.minTitleLength,
				`Title must be at least ${settings.minTitleLength} characters`,
			)
			.max(
				settings.maxTitleLength,
				`Title must be at most ${settings.maxTitleLength} characters`,
			),
		content: z.string(),
		authors: z
			.array(
				z.object({
					firstName: z.string(),
					lastName: z.string(),
					email: z.string(),
					affiliationId: z.string().nullable(),
					affiliationName: z.string(),
					isPresenter: z.boolean(),
				}),
			)
			.refine(
				(authors) => authors.every((a) => a.firstName.length > 0),
				"First name is required for all authors",
			)
			.refine(
				(authors) => authors.every((a) => a.lastName.length > 0),
				"Last name is required for all authors",
			)
			.refine(
				(authors) => authors.every((a) => a.email.length > 0),
				"Email is required for all authors",
			)
			.refine(
				(authors) => authors.every((a) => a.affiliationName.length > 0),
				"Affiliation is required for all authors",
			),
		keywords: z.array(z.string()),
		file: z.custom<File | null>(),
		contentFormat: z.enum(["TEXT", "FILE"]),
		trackId: z.string().nullable(),
	});
}

export function SubmissionForm({
	onSubmit,
	onSaveDraft,
	initialData,
	typeConfigs,
	validationSettings,
	guidelines,
	extractionEnabled,
}: SubmissionFormProps) {
	const [isSavingDraft, setIsSavingDraft] = useState(false);
	const { user } = useSession();
	const hasAutoFilledRef = useRef(false);

	// Default to first active type
	const defaultType = typeConfigs[0]?.type || "ABSTRACT";
	const defaultConfig = typeConfigs[0]?.config;

	// Local state for selected type (triggers re-render when changed)
	const [selectedType, setSelectedType] = useState<
		"ABSTRACT" | "POSTER" | "FULL_PAPER"
	>(initialData?.type || defaultType);

	const submissionSchema = useMemo(
		() => createSubmissionSchema(validationSettings),
		[validationSettings],
	);

	// Content schema for text format
	const contentSchema = useMemo(
		() =>
			z.object({
				content: z
					.string()
					.min(
						validationSettings.minAbstractLength,
						`Abstract must be at least ${validationSettings.minAbstractLength} characters`,
					)
					.max(
						validationSettings.maxAbstractLength,
						`Abstract must be at most ${validationSettings.maxAbstractLength} characters`,
					),
			}),
		[validationSettings],
	);

	// Substitute placeholders in guidelines
	const renderedGuidelines = useMemo(() => {
		if (!guidelines) return null;
		return substituteGuidelines(guidelines, validationSettings);
	}, [guidelines, validationSettings]);

	const form = useAppForm({
		defaultValues: {
			type: initialData?.type || defaultType,
			title: initialData?.title || "",
			content: initialData?.content || "",
			authors: initialData?.authors || [
				{
					firstName: "",
					lastName: "",
					email: "",
					affiliationId: null,
					affiliationName: "",
					isPresenter: true,
				},
			],
			keywords: initialData?.keywords || [],
			file: initialData?.file || null,
			contentFormat: defaultConfig?.contentFormat || "TEXT",
			trackId: initialData?.trackId || null,
		} satisfies SubmissionFormData,
		validators: {
			onChange: submissionSchema,
			onSubmit: submissionSchema,
		},
		onSubmit: async ({ value }) => {
			await onSubmit(value);
		},
	});

	// Track if we're currently fetching affiliation to prevent duplicate requests
	const isFetchingAffiliationRef = useRef(false);

	// Auto-fill first author with user data (only for new submissions)
	useEffect(() => {
		if (initialData?.authors) return;
		if (!user) return;

		const authors = form.state.values.authors;
		const firstAuthor = authors[0];
		const isEmpty =
			!firstAuthor?.firstName && !firstAuthor?.lastName && !firstAuthor?.email;
		const needsAffiliation =
			firstAuthor &&
			!firstAuthor.affiliationName &&
			user.affiliationId &&
			!isFetchingAffiliationRef.current;

		// Case 1: First auto-fill - user data is available and first author is empty
		if (isEmpty && !hasAutoFilledRef.current) {
			hasAutoFilledRef.current = true;

			if (user.affiliationId) {
				isFetchingAffiliationRef.current = true;
				getAffiliationById({ data: { id: user.affiliationId } })
					.then((affiliation) => {
						form.setFieldValue("authors", [
							{
								firstName: user.firstName ?? "",
								lastName: user.lastName ?? "",
								email: user.email ?? "",
								affiliationId: user.affiliationId ?? null,
								affiliationName: affiliation?.name ?? "",
								isPresenter: true,
							},
							...authors.slice(1),
						]);
					})
					.catch(() => {
						form.setFieldValue("authors", [
							{
								firstName: user.firstName ?? "",
								lastName: user.lastName ?? "",
								email: user.email ?? "",
								affiliationId: user.affiliationId ?? null,
								affiliationName: "",
								isPresenter: true,
							},
							...authors.slice(1),
						]);
					})
					.finally(() => {
						isFetchingAffiliationRef.current = false;
					});
			} else {
				form.setFieldValue("authors", [
					{
						firstName: user.firstName ?? "",
						lastName: user.lastName ?? "",
						email: user.email ?? "",
						affiliationId: null,
						affiliationName: "",
						isPresenter: true,
					},
					...authors.slice(1),
				]);
			}
		}
		// Case 2: User was already filled but affiliationId became available later
		else if (
			needsAffiliation &&
			hasAutoFilledRef.current &&
			user.affiliationId
		) {
			const affiliationId = user.affiliationId;
			isFetchingAffiliationRef.current = true;
			getAffiliationById({ data: { id: affiliationId } })
				.then((affiliation) => {
					if (affiliation) {
						const currentAuthors = form.state.values.authors;
						const updatedAuthors = [...currentAuthors];
						updatedAuthors[0] = {
							...updatedAuthors[0],
							affiliationId: affiliationId,
							affiliationName: affiliation.name,
						};
						form.setFieldValue("authors", updatedAuthors);
					}
				})
				.catch(() => {
					// Silently fail - AffiliationSelect has its own fallback
				})
				.finally(() => {
					isFetchingAffiliationRef.current = false;
				});
		}
	}, [user, initialData?.authors, form]);

	const values = useStore(form.store, (state) => state.values);

	// Get current type config (use selectedType for reactive updates)
	const currentTypeConfig = typeConfigs.find((t) => t.type === selectedType);

	// Load active tracks when type is ABSTRACT and enableTrackSelection is true
	const showTracks =
		selectedType === "ABSTRACT" &&
		!!currentTypeConfig?.config.enableTrackSelection;
	const { data: activeTracks = [] } = useQuery({
		...activeTracksQueryOptions(),
		enabled: showTracks,
	});
	const isFileFormat = currentTypeConfig?.config.contentFormat === "FILE";

	// Update contentFormat when type changes
	const handleTypeChange = (newType: "ABSTRACT" | "POSTER" | "FULL_PAPER") => {
		setSelectedType(newType); // Trigger re-render
		form.setFieldValue("type", newType);
		const newConfig = typeConfigs.find((t) => t.type === newType);
		if (newConfig) {
			form.setFieldValue("contentFormat", newConfig.config.contentFormat);
			// Clear file if switching to TEXT format
			if (newConfig.config.contentFormat === "TEXT") {
				form.setFieldValue("file", null);
			}
			// Clear content and its stale validation errors when switching to FILE format.
			// setFieldValue triggers the field-level onChange validator before React
			// re-renders to remove it, leaving a stale error that blocks canSubmit.
			if (newConfig.config.contentFormat === "FILE") {
				form.setFieldValue("content", "");
				form.setFieldMeta("content", (prev) => ({
					...prev,
					errorMap: {},
					errorSourceMap: {},
				}));
			}
		}
	};

	// Progress indicators (use validation settings)
	const hasType = !!values.type;
	const hasContent = isFileFormat
		? values.file !== null
		: values.title.length >= validationSettings.minTitleLength &&
			values.content.length >= validationSettings.minAbstractLength;
	const hasAuthors =
		values.authors.length > 0 &&
		values.authors.every(
			(a) => a.firstName && a.lastName && a.email && a.affiliationName,
		);
	const hasKeywords =
		!validationSettings.enableKeywords ||
		values.keywords.length >= validationSettings.minKeywords;

	// Get allowed extensions for file dropzone
	const allowedExtensions = currentTypeConfig?.config.allowedExtensions || [];
	const acceptString = allowedExtensions.map((ext) => `.${ext}`).join(",");

	// Document extraction hook
	const {
		isExtracting,
		elapsedSeconds,
		handleFileChange: handleFileWithExtraction,
	} = useDocumentExtraction({
		enabled: !!extractionEnabled,
		skipExtraction: !!initialData?.title,
		onExtracted: ({ title, authors, keywords }) => {
			if (title) form.setFieldValue("title", title);
			if (authors) {
				form.setFieldValue("authors", authors);
				hasAutoFilledRef.current = true;
			}
			if (keywords) form.setFieldValue("keywords", keywords);
		},
	});

	return (
		<div className="mx-auto w-full max-w-7xl">
			<div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
				{/* Main Form */}
				<div className="relative overflow-hidden rounded-2xl bg-card shadow-2xl">
					<ExtractionOverlay
						isExtracting={isExtracting}
						elapsedSeconds={elapsedSeconds}
					/>
					<div className="p-8">
						{/* Header */}
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
							onSubmit={(e) => {
								e.preventDefault();
								e.stopPropagation();
								submitForm(form);
							}}
							className="space-y-6"
						>
							{/* Type Selection Section */}
							<div className="space-y-4">
								<div className="flex items-center gap-3">
									<IconCategory className="size-5 text-muted-foreground" />
									<h2 className="text-lg font-semibold text-foreground">
										Submission Type
									</h2>
								</div>
								<form.Field name="type">
									{() => (
										<div
											className={cn(
												"grid gap-3",
												typeConfigs.length === 2 && "grid-cols-2",
												typeConfigs.length >= 3 && "grid-cols-2 sm:grid-cols-3",
											)}
										>
											{typeConfigs.map((option) => {
												const Icon = typeIcons[option.type];
												const isSelected = selectedType === option.type;
												return (
													<button
														key={option.type}
														type="button"
														onClick={() => handleTypeChange(option.type)}
														className={cn(
															"flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left",
															isSelected
																? "border-primary bg-primary/5"
																: "border-border hover:border-primary/50",
														)}
													>
														<div
															className={cn(
																"flex-shrink-0 p-2 rounded-md",
																isSelected ? "bg-primary/10" : "bg-muted",
															)}
														>
															<Icon
																className={cn(
																	"size-5",
																	isSelected
																		? "text-primary"
																		: "text-muted-foreground",
																)}
															/>
														</div>
														<span
															className={cn(
																"font-medium",
																isSelected
																	? "text-foreground"
																	: "text-muted-foreground",
															)}
														>
															{option.label}
														</span>
													</button>
												);
											})}
										</div>
									)}
								</form.Field>
							</div>

							{/* File upload (above content when extraction enabled) */}
							{isFileFormat && extractionEnabled && (
								<>
									<div className="border-t" />
									<form.Field name="file">
										{(field) => (
											<FileUploadSection
												value={field.state.value}
												onChange={(file) =>
													handleFileWithExtraction(file, field.handleChange)
												}
												accept={acceptString}
												maxSize={validationSettings.maxFileSize}
												allowedExtensions={allowedExtensions}
											/>
										)}
									</form.Field>
								</>
							)}

							<div className="border-t" />

							{/* Content Section */}
							<div className="space-y-4">
								<div className="flex items-center gap-3">
									<IconWriting className="size-5 text-muted-foreground" />
									<h2 className="text-lg font-semibold text-foreground">
										Content
									</h2>
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
												field.state.meta.isBlurred &&
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
														errors={
															hasError ? field.state.meta.errors : undefined
														}
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

							<div className="border-t" />

							{/* Authors Section */}
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
											field.state.meta.isBlurred &&
											field.state.meta.errors.length > 0;
										return (
											<Field data-invalid={hasError}>
												<AuthorsInput
													value={field.state.value}
													onChange={field.handleChange}
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

							{/* Keywords Section */}
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
													field.state.meta.isBlurred &&
													field.state.meta.errors.length > 0;
												return (
													<Field data-invalid={hasError}>
														<div className="rounded-lg border bg-muted/30 p-3">
															<KeywordsInput
																value={field.state.value}
																onChange={field.handleChange}
																maxKeywords={validationSettings.maxKeywords}
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

							{/* Session Selection (Oral Presentation only) */}
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
														value={field.state.value || "none"}
														onValueChange={(v) =>
															field.handleChange(v === "none" ? null : v)
														}
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

							{/* Submit */}
							<div className="flex items-center justify-between pt-4 border-t gap-3">
								<p className="text-xs text-muted-foreground hidden sm:block">
									By submitting, you agree to the conference guidelines
								</p>
								<div className="flex gap-2 ml-auto">
									{onSaveDraft && (
										<Button
											type="button"
											variant="outline"
											disabled={isSavingDraft || form.state.isSubmitting}
											className="gap-2"
											onClick={async () => {
												setIsSavingDraft(true);
												try {
													await onSaveDraft(form.state.values);
												} finally {
													setIsSavingDraft(false);
												}
											}}
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
										type="submit"
										disabled={form.state.isSubmitting || isSavingDraft}
										className="gap-2 px-6"
									>
										{form.state.isSubmitting ? (
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
							</div>
						</form>
					</div>
				</div>

				{/* Sidebar */}
				<div className="hidden lg:block">
					<div className="sticky space-y-4">
						{/* Progress Card */}
						<div className="rounded-2xl bg-card shadow-xl p-6 border border-border/50">
							<h3 className="font-semibold text-foreground mb-4">Progress</h3>
							<div className="space-y-3">
								<div className="flex items-center gap-3">
									{hasType ? (
										<IconCircleCheck className="size-5 text-primary" />
									) : (
										<IconCircle className="size-5 text-muted-foreground" />
									)}
									<span
										className={cn(
											"text-sm",
											hasType ? "text-foreground" : "text-muted-foreground",
										)}
									>
										Submission Type
									</span>
								</div>
								<div className="flex items-center gap-3">
									{hasContent ? (
										<IconCircleCheck className="size-5 text-primary" />
									) : (
										<IconCircle className="size-5 text-muted-foreground" />
									)}
									<span
										className={cn(
											"text-sm",
											hasContent ? "text-foreground" : "text-muted-foreground",
										)}
									>
										Content
									</span>
								</div>
								<div className="flex items-center gap-3">
									{hasAuthors ? (
										<IconCircleCheck className="size-5 text-primary" />
									) : (
										<IconCircle className="size-5 text-muted-foreground" />
									)}
									<span
										className={cn(
											"text-sm",
											hasAuthors ? "text-foreground" : "text-muted-foreground",
										)}
									>
										Authors
									</span>
								</div>
								{validationSettings.enableKeywords && (
									<div className="flex items-center gap-3">
										{hasKeywords ? (
											<IconCircleCheck className="size-5 text-primary" />
										) : (
											<IconCircle className="size-5 text-muted-foreground" />
										)}
										<span
											className={cn(
												"text-sm",
												hasKeywords
													? "text-foreground"
													: "text-muted-foreground",
											)}
										>
											Keywords
										</span>
									</div>
								)}
							</div>
						</div>

						{/* Guidelines Card */}
						<div className="rounded-2xl bg-card shadow-xl p-6 border border-border/50">
							<div className="flex items-center gap-2 mb-4">
								<IconInfoCircle className="size-5 text-muted-foreground" />
								<h3 className="font-semibold text-foreground">Guidelines</h3>
							</div>
							{renderedGuidelines ? (
								<Markdown
									content={renderedGuidelines}
									className="text-sm text-muted-foreground"
								/>
							) : (
								<div className="space-y-3 text-sm text-muted-foreground">
									<p>Title should be concise and descriptive</p>
									{isFileFormat ? (
										<p>
											Upload your document as{" "}
											{allowedExtensions.map((e) => e.toUpperCase()).join(", ")}
										</p>
									) : (
										<p>
											Abstract minimum {validationSettings.minAbstractLength}{" "}
											characters
										</p>
									)}
									<p>At least one author required</p>
									{validationSettings.enableKeywords && (
										<p>
											Add {validationSettings.minKeywords}-
											{validationSettings.maxKeywords} relevant keywords
										</p>
									)}
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
