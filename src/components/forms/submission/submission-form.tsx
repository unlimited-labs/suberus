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
import { useForm, useStore } from "@tanstack/react-form";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { FieldError } from "@/components/forms/field-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Markdown } from "@/components/ui/markdown";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/hooks/use-session";
import { useZodFormField } from "@/hooks/use-zod-form-field";
import type { SubmissionTypeConfig } from "@/lib/settings/types";
import { cn } from "@/lib/utils";
import { getAffiliationById } from "@/utils/affiliations.functions";
import { getActiveSessionsFn } from "@/utils/sessions.functions";
import { type Author, AuthorsInput } from "./authors-input";
import { FileDropzone } from "./file-dropzone";
import { KeywordsInput } from "./keywords-input";

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
}

export interface SubmissionFormData {
	type: "ABSTRACT" | "POSTER" | "FULL_PAPER";
	title: string;
	content: string;
	authors: Author[];
	keywords: string[];
	file: File | null;
	contentFormat: "TEXT" | "FILE";
	sessionId: string | null;
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

export function SubmissionForm({
	onSubmit,
	onSaveDraft,
	initialData,
	typeConfigs,
	validationSettings,
	guidelines,
}: SubmissionFormProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
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
	const [activeSessions, setActiveSessions] = useState<
		{ id: string; name: string }[]
	>([]);

	// Zod validators for title and content
	const titleValidators = useZodFormField(
		z
			.string()
			.min(
				validationSettings.minTitleLength,
				`Title must be at least ${validationSettings.minTitleLength} characters`,
			)
			.max(
				validationSettings.maxTitleLength,
				`Title must be at most ${validationSettings.maxTitleLength} characters`,
			),
	);

	const contentValidators = useZodFormField(
		z
			.string()
			.min(
				validationSettings.minAbstractLength,
				`Abstract must be at least ${validationSettings.minAbstractLength} characters`,
			)
			.max(
				validationSettings.maxAbstractLength,
				`Abstract must be at most ${validationSettings.maxAbstractLength} characters`,
			),
	);

	// Substitute placeholders in guidelines
	const renderedGuidelines = useMemo(() => {
		if (!guidelines) return null;
		return substituteGuidelines(guidelines, validationSettings);
	}, [guidelines, validationSettings]);

	const form = useForm({
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
			sessionId: initialData?.sessionId || null,
		} satisfies SubmissionFormData,
		onSubmit: async ({ value }) => {
			setIsSubmitting(true);
			try {
				await onSubmit(value);
			} finally {
				setIsSubmitting(false);
			}
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

	// Load active sessions when type is ABSTRACT and enableSessionSelection is true
	useEffect(() => {
		if (
			selectedType === "ABSTRACT" &&
			currentTypeConfig?.config.enableSessionSelection
		) {
			getActiveSessionsFn().then(setActiveSessions);
		} else {
			setActiveSessions([]);
		}
	}, [selectedType, currentTypeConfig]);
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
			// Clear content if switching to FILE format
			if (newConfig.config.contentFormat === "FILE") {
				form.setFieldValue("content", "");
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

	return (
		<div className="mx-auto w-full max-w-7xl">
			<div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
				{/* Main Form */}
				<div className="overflow-hidden rounded-2xl bg-card shadow-2xl">
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
								form.handleSubmit();
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
														<div className="flex flex-col">
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
															<span className="text-xs text-muted-foreground">
																{option.config.contentFormat === "FILE"
																	? "File upload"
																	: "Text"}
															</span>
														</div>
													</button>
												);
											})}
										</div>
									)}
								</form.Field>
							</div>

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
									<form.Field name="title" validators={titleValidators}>
										{(field) => (
											<div className="space-y-2">
												<Label htmlFor="title" className="text-foreground">
													Title
												</Label>
												<Input
													id="title"
													name="title"
													value={field.state.value}
													onChange={(e) => field.handleChange(e.target.value)}
													onBlur={field.handleBlur}
													className="text-foreground"
												/>
												<FieldError errors={field.state.meta.errors} />
											</div>
										)}
									</form.Field>

									{/* Content field always mounted to keep TanStack Form instance alive;
									   validators disabled for FILE format to prevent stale validation blocking submit */}
									<form.Field
										name="content"
										validators={isFileFormat ? undefined : contentValidators}
									>
										{(field) =>
											!isFileFormat ? (
												<div className="space-y-2">
													<Label htmlFor="content" className="text-foreground">
														Abstract
													</Label>
													<Textarea
														id="content"
														name="content"
														value={field.state.value}
														onChange={(e) => field.handleChange(e.target.value)}
														onBlur={field.handleBlur}
														rows={8}
														className="resize-none text-foreground"
													/>
													<FieldError errors={field.state.meta.errors} />
												</div>
											) : null
										}
									</form.Field>

									{/* Show file dropzone ONLY for FILE format */}
									{isFileFormat && (
										<form.Field name="file">
											{(field) => (
												<div className="space-y-2">
													<Label className="text-foreground">
														Document{" "}
														<span className="text-destructive text-xs font-normal">
															*
														</span>
													</Label>
													<FileDropzone
														value={field.state.value}
														onChange={field.handleChange}
														accept={acceptString}
														maxSize={validationSettings.maxFileSize}
													/>
													{!field.state.value && (
														<p className="text-xs text-muted-foreground">
															Accepted formats:{" "}
															{allowedExtensions
																.map((e) => e.toUpperCase())
																.join(", ")}
														</p>
													)}
												</div>
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
									{(field) => (
										<div>
											<AuthorsInput
												value={field.state.value}
												onChange={field.handleChange}
											/>
											{field.state.meta.errors.length > 0 && (
												<p className="text-xs text-destructive mt-2">
													{field.state.meta.errors[0]}
												</p>
											)}
										</div>
									)}
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
											{(field) => (
												<div className="space-y-2">
													<div className="rounded-lg border bg-muted/30 p-3">
														<KeywordsInput
															value={field.state.value}
															onChange={field.handleChange}
															minKeywords={validationSettings.minKeywords}
															maxKeywords={validationSettings.maxKeywords}
														/>
													</div>
													{field.state.meta.errors.length > 0 && (
														<p className="text-xs text-destructive">
															{field.state.meta.errors[0]}
														</p>
													)}
												</div>
											)}
										</form.Field>
									</div>
								</>
							)}

							{/* Session Selection (Oral Presentation only) */}
							{selectedType === "ABSTRACT" &&
								currentTypeConfig?.config.enableSessionSelection &&
								activeSessions.length > 0 && (
									<>
										<div className="border-t" />

										<div className="space-y-4">
											<div className="flex items-center gap-3">
												<IconPresentation className="size-5 text-muted-foreground" />
												<h2 className="text-lg font-semibold text-foreground">
													Preferred Session
												</h2>
											</div>

											<form.Field name="sessionId">
												{(field) => (
													<Select
														value={field.state.value || "none"}
														onValueChange={(v) =>
															field.handleChange(v === "none" ? null : v)
														}
													>
														<SelectTrigger>
															<SelectValue placeholder="Select session (optional)" />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="none">None</SelectItem>
															{activeSessions.map((s) => (
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
											disabled={isSavingDraft || isSubmitting}
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
										disabled={isSubmitting || isSavingDraft}
										className="gap-2 px-6"
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
							</div>
						</form>
					</div>
				</div>

				{/* Sidebar */}
				<div className="hidden lg:block">
					<div className="sticky space-y-4">
						{/* Progress Card */}
						<div className="rounded-2xl bg-card shadow-xl p-6 border">
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
						<div className="rounded-2xl bg-card shadow-xl p-6 border">
							<div className="flex items-center gap-2 mb-4">
								<IconInfoCircle className="size-5 text-muted-foreground" />
								<h3 className="font-semibold text-foreground">Guidelines</h3>
							</div>
							{renderedGuidelines ? (
								<div className="text-sm text-muted-foreground">
									<Markdown content={renderedGuidelines} />
								</div>
							) : (
								<div className="space-y-3 text-sm text-muted-foreground">
									<p>• Title should be concise and descriptive</p>
									{isFileFormat ? (
										<p>
											• Upload your document as{" "}
											{allowedExtensions.map((e) => e.toUpperCase()).join(", ")}
										</p>
									) : (
										<p>
											• Abstract minimum {validationSettings.minAbstractLength}{" "}
											characters
										</p>
									)}
									<p>• At least one author required</p>
									{validationSettings.enableKeywords && (
										<p>
											• Add {validationSettings.minKeywords}-
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
