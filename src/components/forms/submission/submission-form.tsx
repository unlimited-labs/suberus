import {
	IconCategory,
	IconCircle,
	IconCircleCheck,
	IconFile,
	IconFileText,
	IconInfoCircle,
	IconSend,
	IconSparkles,
	IconTags,
	IconUsers,
	IconWriting,
} from "@tabler/icons-react";
import { useForm } from "@tanstack/react-form";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/hooks/use-session";
import type { SubmissionTypeConfig } from "@/lib/settings/types";
import { cn } from "@/lib/utils";
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
}

interface SubmissionFormProps {
	onSubmit: (data: SubmissionFormData) => Promise<void>;
	initialData?: Partial<SubmissionFormData>;
	typeConfigs: ActiveSubmissionType[];
	validationSettings: ValidationSettings;
}

export interface SubmissionFormData {
	type: "ABSTRACT" | "POSTER" | "FULL_PAPER";
	title: string;
	content: string;
	authors: Author[];
	keywords: string[];
	file: File | null;
	contentFormat: "TEXT" | "FILE";
}

export function SubmissionForm({
	onSubmit,
	initialData,
	typeConfigs,
	validationSettings,
}: SubmissionFormProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const { user } = useSession();
	const hasAutoFilledRef = useRef(false);

	// Default to first active type
	const defaultType = typeConfigs[0]?.type || "ABSTRACT";
	const defaultConfig = typeConfigs[0]?.config;

	// Local state for selected type (triggers re-render when changed)
	const [selectedType, setSelectedType] = useState<
		"ABSTRACT" | "POSTER" | "FULL_PAPER"
	>(initialData?.type || defaultType);

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

	// Auto-fill first author with user data (only for new submissions)
	useEffect(() => {
		if (hasAutoFilledRef.current || initialData?.authors) return;
		if (!user) return;

		const authors = form.state.values.authors;
		const firstAuthor = authors[0];
		const isEmpty =
			!firstAuthor?.firstName && !firstAuthor?.lastName && !firstAuthor?.email;

		if (isEmpty) {
			form.setFieldValue("authors", [
				{
					firstName: user.firstName ?? "",
					lastName: user.lastName ?? "",
					email: user.email ?? "",
					affiliationId: user.affiliationId ?? null,
					affiliationName: "", // AffiliationSelect will fetch name via initValueId
					isPresenter: true,
				},
				...authors.slice(1),
			]);
			hasAutoFilledRef.current = true;
		}
	}, [user, initialData?.authors, form]);

	const values = form.state.values;

	// Get current type config (use selectedType for reactive updates)
	const currentTypeConfig = typeConfigs.find((t) => t.type === selectedType);
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
	const hasKeywords = values.keywords.length >= validationSettings.minKeywords;

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
								New Submission
							</h1>
							<p className="text-sm text-muted-foreground mt-1">
								Submit your work for the conference
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
									<form.Field name="title">
										{(field) => {
											const len = field.state.value.length;
											const isValid =
												len >= validationSettings.minTitleLength &&
												len <= validationSettings.maxTitleLength;
											return (
												<div className="space-y-2">
													<div className="flex items-center justify-between">
														<Label htmlFor="title" className="text-foreground">
															Title
														</Label>
														<span
															className={cn(
																"text-xs",
																!isValid && len > 0
																	? "text-destructive"
																	: "text-muted-foreground",
															)}
														>
															{len} / {validationSettings.minTitleLength}-
															{validationSettings.maxTitleLength} characters
														</span>
													</div>
													<Input
														id="title"
														name="title"
														value={field.state.value}
														onChange={(e) => field.handleChange(e.target.value)}
														onBlur={field.handleBlur}
														className="text-foreground"
													/>
													{field.state.meta.errors.length > 0 && (
														<p className="text-xs text-destructive">
															{field.state.meta.errors[0]}
														</p>
													)}
												</div>
											);
										}}
									</form.Field>

									{/* Show text area for TEXT format */}
									{!isFileFormat && (
										<form.Field name="content">
											{(field) => {
												const len = field.state.value.length;
												const isValid =
													len >= validationSettings.minAbstractLength &&
													len <= validationSettings.maxAbstractLength;
												return (
													<div className="space-y-2">
														<div className="flex items-center justify-between">
															<Label
																htmlFor="content"
																className="text-foreground"
															>
																Abstract
															</Label>
															<span
																className={cn(
																	"text-xs",
																	!isValid && len > 0
																		? "text-destructive"
																		: "text-muted-foreground",
																)}
															>
																{len} / {validationSettings.minAbstractLength}-
																{validationSettings.maxAbstractLength} characters
															</span>
														</div>
														<Textarea
															id="content"
															name="content"
															value={field.state.value}
															onChange={(e) =>
																field.handleChange(e.target.value)
															}
															onBlur={field.handleBlur}
															rows={8}
															className="resize-none text-foreground"
														/>
														{field.state.meta.errors.length > 0 && (
															<p className="text-xs text-destructive">
																{field.state.meta.errors[0]}
															</p>
														)}
													</div>
												);
											}}
										</form.Field>
									)}

									{/* Show file dropzone for FILE format or as optional for TEXT */}
									<form.Field name="file">
										{(field) => (
											<div className="space-y-2">
												<Label className="text-foreground">
													Document{" "}
													{!isFileFormat && (
														<span className="text-muted-foreground text-xs font-normal">
															(Optional)
														</span>
													)}
													{isFileFormat && (
														<span className="text-destructive text-xs font-normal">
															*
														</span>
													)}
												</Label>
												<FileDropzone
													value={field.state.value}
													onChange={field.handleChange}
													accept={isFileFormat ? acceptString : ".pdf,.doc,.docx"}
													maxSize={10}
												/>
												{isFileFormat && !field.state.value && (
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

							<div className="border-t" />

							{/* Keywords Section */}
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

							{/* Submit */}
							<div className="flex items-center justify-between pt-4 border-t">
								<p className="text-xs text-muted-foreground">
									By submitting, you agree to the conference guidelines
								</p>
								<Button
									type="submit"
									disabled={isSubmitting}
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
								<div className="flex items-center gap-3">
									{hasKeywords ? (
										<IconCircleCheck className="size-5 text-primary" />
									) : (
										<IconCircle className="size-5 text-muted-foreground" />
									)}
									<span
										className={cn(
											"text-sm",
											hasKeywords ? "text-foreground" : "text-muted-foreground",
										)}
									>
										Keywords
									</span>
								</div>
							</div>
						</div>

						{/* Guidelines Card */}
						<div className="rounded-2xl bg-card shadow-xl p-6 border">
							<div className="flex items-center gap-2 mb-4">
								<IconInfoCircle className="size-5 text-muted-foreground" />
								<h3 className="font-semibold text-foreground">Guidelines</h3>
							</div>
							<div className="space-y-3 text-sm text-muted-foreground">
								<p>• Title should be concise and descriptive</p>
								{isFileFormat ? (
									<p>• Upload your document as PDF, DOC, or DOCX</p>
								) : (
									<p>• Abstract minimum 100 characters</p>
								)}
								<p>• At least one author required</p>
								<p>• Add 1-5 relevant keywords</p>
								{!isFileFormat && <p>• Document upload is optional</p>}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
