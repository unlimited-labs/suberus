import {
	IconAlertCircle,
	IconCheck,
	IconChevronDown,
	IconChevronUp,
	IconCircle,
	IconCircleCheck,
	IconDownload,
	IconFile,
	IconFileText,
	IconLock,
	IconMessageCircle,
	IconPaperclip,
	IconScale,
	IconStar,
	IconStarFilled,
	IconX,
} from "@tabler/icons-react";
import { useStore } from "@tanstack/react-form";
import { useMemo, useState } from "react";
import { FileDropzone } from "@/components/forms/submission/file-dropzone";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Markdown } from "@/components/ui/markdown";
import type { ReviewDecision, SubmissionType } from "@/generated/prisma/enums";
import { useAppForm } from "@/hooks/use-app-form";
import { typeLabels } from "@/lib/labels/submission";
import { FILE_ACCEPT_ATTRIBUTE } from "@/lib/settings/file-types";
import { cn, formatFileSize } from "@/lib/utils";
import {
	createReviewSchema,
	type ReviewFormData,
} from "@/lib/validations/review";

interface SubmissionAuthor {
	firstName: string;
	lastName: string;
	affiliationName: string | null;
	isPresenter: boolean;
}

interface ReviewFormProps {
	onSubmit: (data: ReviewFormData) => Promise<void>;
	initialData?: Partial<ReviewFormData>;
	submission: {
		title: string;
		type: SubmissionType | string;
		authors: SubmissionAuthor[];
		content?: string;
		file?: {
			id: string;
			fileName: string;
			originalName: string;
			mimeType: string;
			size: number;
		} | null;
	};
	reviewMode: "OPEN" | "SINGLE_BLIND" | "DOUBLE_BLIND";
	guidelines?: string;
	scoringCriteria?: { name: string; description: string }[];
	enableConfidenceLevel?: boolean;
	enableReviewAttachment?: boolean;
	onAttachmentChange?: (file: File | null) => void;
	existingAttachment?: {
		id: string;
		fileName: string;
		originalName: string;
		size: number;
	};
	readOnly?: boolean;
}

const decisionOptions = [
	{
		value: "ACCEPT" as const,
		label: "Accept",
		description: "Recommends accepting the work as-is, with no changes.",
		icon: IconCheck,
		color: "emerald",
	},
	{
		value: "ACCEPT_WITH_MINOR_REVISIONS" as const,
		label: "Accept with Minor Revisions",
		description:
			"Recommends conditional acceptance — the author fixes small issues, with no new review round.",
		icon: IconCircleCheck,
		color: "sky",
	},
	{
		value: "REVISE_AND_RESUBMIT" as const,
		label: "Revise and Resubmit",
		description:
			"Sends the work back for substantial changes and another review round.",
		icon: IconAlertCircle,
		color: "amber",
	},
	{
		value: "REJECT" as const,
		label: "Reject",
		description:
			"Recommends rejection — the work cannot be accepted, even after revisions.",
		icon: IconX,
		color: "red",
	},
];

const confidenceLevels = [
	{ value: 1, label: "Very Low", description: "Outside my expertise" },
	{ value: 2, label: "Low", description: "Familiar but not expert" },
	{ value: 3, label: "Medium", description: "Knowledgeable" },
	{ value: 4, label: "High", description: "Expert in this area" },
	{ value: 5, label: "Very High", description: "Leading expert" },
];

export function ReviewForm({
	onSubmit,
	initialData,
	submission,
	reviewMode,
	guidelines,
	scoringCriteria = [],
	enableConfidenceLevel = true,
	enableReviewAttachment = false,
	onAttachmentChange,
	existingAttachment,
	readOnly = false,
}: ReviewFormProps) {
	const [contentExpanded, setContentExpanded] = useState(false);
	const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
	const [keepExistingAttachment, setKeepExistingAttachment] = useState(
		!!existingAttachment,
	);

	const reviewSchema = useMemo(
		() =>
			createReviewSchema({
				enableConfidenceLevel,
				scoringCriteria,
			}),
		[enableConfidenceLevel, scoringCriteria],
	);

	// Build initial scores from criteria
	const initialScores: Record<string, number> = {};
	for (const c of scoringCriteria) {
		initialScores[c.name] = initialData?.scores?.[c.name] ?? 3;
	}

	const form = useAppForm({
		defaultValues: {
			decision: initialData?.decision || ("ACCEPT" as ReviewDecision),
			scores: initialScores,
			confidenceLevel: initialData?.confidenceLevel || 3,
			comments: initialData?.comments || "",
			privateNotes: initialData?.privateNotes || "",
		},
		validators: {
			onChange: reviewSchema,
			onSubmit: reviewSchema,
		},
		onSubmit: async ({ value }) => {
			await onSubmit(value);
		},
	});

	const values = useStore(form.store, (state) => state.values);

	// Progress indicators
	const hasDecision = !!values.decision;
	const hasScores =
		scoringCriteria.length === 0 ||
		scoringCriteria.every((c) => (values.scores[c.name] ?? 0) > 0);
	const hasConfidence = !enableConfidenceLevel || values.confidenceLevel > 0;
	const hasComments = true;

	const allComplete = hasDecision && hasScores && hasConfidence && hasComments;

	return (
		<div className="mx-auto w-full max-w-7xl">
			<div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
				{/* Main Form */}
				<div className="overflow-hidden rounded-2xl bg-card shadow-2xl">
					<div className="p-8">
						{/* Header */}
						<div className="mb-8 space-y-4">
							<div>
								<div className="flex items-center gap-2 mb-2">
									<Badge variant="outline" className="text-xs">
										{typeLabels[submission.type as SubmissionType] ??
											submission.type}
									</Badge>
								</div>
								<h1 className="text-2xl font-semibold tracking-tight text-foreground">
									{submission.title}
								</h1>
							</div>

							{/* Authors - only show if not double-blind */}
							{reviewMode !== "DOUBLE_BLIND" &&
								submission.authors.length > 0 && (
									<div className="space-y-2">
										<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
											Authors
										</p>
										<div className="flex flex-wrap gap-2">
											{submission.authors.map((author, index) => (
												<div
													key={index}
													className={cn(
														"flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm",
														author.isPresenter
															? "border-primary/30 bg-primary/5"
															: "border-border bg-muted/30",
													)}
												>
													{author.isPresenter && (
														<IconStarFilled className="size-3 text-primary" />
													)}
													<span className="text-foreground">
														{author.firstName} {author.lastName}
													</span>
												</div>
											))}
										</div>
									</div>
								)}

							{reviewMode === "DOUBLE_BLIND" && (
								<div className="rounded-lg border border-border/50 bg-muted/30 p-3">
									<p className="text-sm text-muted-foreground italic">
										Double-blind review - author information hidden
									</p>
								</div>
							)}
						</div>

						{/* Submission Content Section */}
						{(submission.content || submission.file) && (
							<div className="border rounded-lg overflow-hidden">
								<button
									type="button"
									onClick={() => setContentExpanded(!contentExpanded)}
									className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
								>
									<div className="flex items-center gap-2">
										<IconFileText className="size-5 text-muted-foreground" />
										<span className="font-medium text-sm text-foreground">
											Submission Content
										</span>
									</div>
									{contentExpanded ? (
										<IconChevronUp className="size-4 text-muted-foreground" />
									) : (
										<IconChevronDown className="size-4 text-muted-foreground" />
									)}
								</button>
								{contentExpanded && (
									<div className="px-4 pb-4 space-y-3">
										{submission.file && (
											<div className="flex items-center gap-4 p-3 rounded-lg border bg-muted/30">
												<div className="flex-shrink-0 p-2 rounded-md bg-primary/10">
													<IconFile className="size-5 text-primary" />
												</div>
												<div className="flex-1 min-w-0">
													<p className="text-sm font-medium text-foreground truncate">
														{submission.file.originalName}
													</p>
													<p className="text-xs text-muted-foreground">
														{formatFileSize(submission.file.size)}
													</p>
												</div>
												<a
													href={`/api/files/${submission.file.id}`}
													data-testid="file-download-button"
													className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground"
												>
													<IconDownload className="size-4" />
													Download
												</a>
											</div>
										)}
										{submission.content && (
											<div className="text-sm text-foreground leading-relaxed whitespace-pre-line break-words bg-muted/30 p-4 rounded-lg border max-h-96 overflow-auto">
												{submission.content}
											</div>
										)}
									</div>
								)}
							</div>
						)}

						<form
							onSubmit={(e) => {
								e.preventDefault();
								e.stopPropagation();
								void form.handleSubmit();
							}}
							className="space-y-6"
						>
							{/* Decision Section */}
							<div className="space-y-4">
								<div className="flex items-center gap-3">
									<IconScale className="size-5 text-muted-foreground" />
									<h2 className="text-lg font-semibold text-foreground">
										Decision
									</h2>
								</div>
								<form.Field name="decision">
									{(field) => {
										const hasError =
											field.state.meta.isBlurred &&
											field.state.meta.errors.length > 0;
										return (
											<Field data-invalid={hasError}>
												<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
													{decisionOptions.map((option) => {
														const Icon = option.icon;
														const isSelected =
															field.state.value === option.value;
														return (
															<button
																key={option.value}
																type="button"
																disabled={readOnly}
																onClick={() => field.handleChange(option.value)}
																className={cn(
																	"flex flex-col gap-2 p-4 rounded-lg border-2 transition-all text-left",
																	readOnly && "cursor-default",
																	isSelected
																		? "border-primary bg-primary/5"
																		: readOnly
																			? "border-border opacity-60"
																			: "border-border hover:border-primary/50",
																)}
															>
																<div className="flex items-center gap-2">
																	<div
																		className={cn(
																			"flex-shrink-0 p-1.5 rounded-md",
																			isSelected ? "bg-primary/10" : "bg-muted",
																		)}
																	>
																		<Icon
																			className={cn(
																				"size-4",
																				isSelected
																					? "text-primary"
																					: "text-muted-foreground",
																			)}
																		/>
																	</div>
																	<span
																		className={cn(
																			"font-medium text-sm",
																			isSelected
																				? "text-foreground"
																				: "text-muted-foreground",
																		)}
																	>
																		{option.label}
																	</span>
																</div>
																<p className="text-xs text-muted-foreground pl-8">
																	{option.description}
																</p>
															</button>
														);
													})}
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

							{/* Scoring Section — dynamic criteria, condensed */}
							{scoringCriteria.length > 0 && (
								<>
									<div className="border-t" />
									<div className="space-y-4">
										<div className="flex items-center gap-3">
											<IconStar className="size-5 text-muted-foreground" />
											<h2 className="text-lg font-semibold text-foreground">
												Evaluation Criteria
											</h2>
										</div>

										<div className="rounded-lg border divide-y">
											{scoringCriteria.map((criterion) => (
												<form.Field
													key={criterion.name}
													name={`scores.${criterion.name}`}
												>
													{(field) => {
														const currentScore =
															(field.state.value as number) ?? 0;
														return (
															<div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-4 py-3">
																<div className="flex-1 min-w-0">
																	<p className="text-sm font-medium text-foreground">
																		{criterion.name}
																	</p>
																	{criterion.description && (
																		<p className="text-xs text-muted-foreground">
																			{criterion.description}
																		</p>
																	)}
																</div>
																<div className="flex items-center gap-1 shrink-0">
																	{[1, 2, 3, 4, 5].map((score) => (
																		<button
																			key={score}
																			type="button"
																			disabled={readOnly}
																			onClick={() =>
																				field.handleChange(score as never)
																			}
																			className={cn(
																				"size-9 rounded-md border text-sm font-medium transition-all",
																				currentScore === score
																					? "border-primary bg-primary text-primary-foreground shadow-sm"
																					: readOnly
																						? "border-border text-muted-foreground opacity-60"
																						: "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground",
																			)}
																		>
																			{score}
																		</button>
																	))}
																</div>
															</div>
														);
													}}
												</form.Field>
											))}
										</div>
										<p className="text-xs text-muted-foreground px-1">
											1 = Poor &middot; 2 = Below Average &middot; 3 = Average
											&middot; 4 = Good &middot; 5 = Excellent
										</p>
									</div>
								</>
							)}

							{enableConfidenceLevel && (
								<>
									<div className="border-t" />

									{/* Confidence Level */}
									<div className="space-y-4">
										<div className="flex items-center gap-3">
											<IconCircle className="size-5 text-muted-foreground" />
											<h2 className="text-lg font-semibold text-foreground">
												Confidence Level
											</h2>
										</div>
										<form.Field name="confidenceLevel">
											{(field) => {
												const hasError =
													field.state.meta.isBlurred &&
													field.state.meta.errors.length > 0;
												return (
													<Field data-invalid={hasError}>
														<div className="space-y-2">
															<div className="flex items-center gap-2">
																{confidenceLevels.map((level) => (
																	<button
																		key={level.value}
																		type="button"
																		disabled={readOnly}
																		onClick={() =>
																			field.handleChange(level.value)
																		}
																		className={cn(
																			"flex-1 h-12 rounded-lg border-2 transition-all font-medium text-sm",
																			field.state.value === level.value
																				? "border-primary bg-primary text-primary-foreground shadow-sm"
																				: readOnly
																					? "border-border text-muted-foreground opacity-60"
																					: "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground",
																		)}
																	>
																		{level.value}
																	</button>
																))}
															</div>
															<div className="flex justify-between text-xs text-muted-foreground px-1">
																<span>Very Low</span>
																<span>Very High</span>
															</div>
															{field.state.value > 0 && (
																<p className="text-sm text-foreground mt-2">
																	{
																		confidenceLevels[field.state.value - 1]
																			.label
																	}
																	:{" "}
																	<span className="text-muted-foreground">
																		{
																			confidenceLevels[field.state.value - 1]
																				.description
																		}
																	</span>
																</p>
															)}
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

							<div className="border-t" />

							{/* Comments Section */}
							<div className="space-y-4">
								<div className="flex items-center gap-3">
									<IconMessageCircle className="size-5 text-muted-foreground" />
									<h2 className="text-lg font-semibold text-foreground">
										Comments to Authors
									</h2>
								</div>

								<form.AppField name="comments">
									{(field) => (
										<field.TextareaField
											label="Review Comments"
											rows={10}
											placeholder="Provide detailed feedback on the submission's strengths, weaknesses, and suggestions for improvement..."
											className="text-foreground"
											description="These comments will be visible to the authors"
											disabled={readOnly}
										/>
									)}
								</form.AppField>
							</div>

							{/* Attachment Section */}
							{enableReviewAttachment && (
								<>
									<div className="border-t" />
									<div className="space-y-4">
										<div className="flex items-center gap-3">
											<IconPaperclip className="size-5 text-muted-foreground" />
											<h2 className="text-lg font-semibold text-foreground">
												Attachment
											</h2>
											{!readOnly && (
												<Badge variant="outline" className="text-xs">
													Optional
												</Badge>
											)}
										</div>
										{readOnly ? (
											existingAttachment ? (
												<div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-muted/30">
													<div className="flex-shrink-0 p-2 rounded bg-primary/10">
														<IconFile className="size-5 text-primary" />
													</div>
													<div className="flex-1 min-w-0">
														<a
															href={`/api/files/${existingAttachment.id}`}
															className="text-sm font-medium text-foreground hover:underline truncate block"
														>
															{existingAttachment.originalName}
														</a>
														<p className="text-xs text-muted-foreground">
															{formatFileSize(existingAttachment.size)}
														</p>
													</div>
												</div>
											) : (
												<p className="text-sm text-muted-foreground italic">
													No attachment
												</p>
											)
										) : (
											<>
												<p className="text-sm text-muted-foreground">
													Upload a PDF or DOCX file with detailed review notes
												</p>
												{existingAttachment && keepExistingAttachment ? (
													<div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-muted/30">
														<div className="flex-shrink-0 p-2 rounded bg-primary/10">
															<IconFile className="size-5 text-primary" />
														</div>
														<div className="flex-1 min-w-0">
															<a
																href={`/api/files/${existingAttachment.id}`}
																className="text-sm font-medium text-foreground hover:underline truncate block"
															>
																{existingAttachment.originalName}
															</a>
															<p className="text-xs text-muted-foreground">
																{formatFileSize(existingAttachment.size)}
															</p>
														</div>
														<Button
															type="button"
															size="icon-sm"
															variant="ghost"
															onClick={() => {
																setKeepExistingAttachment(false);
																onAttachmentChange?.(null);
															}}
															aria-label="Remove file"
														>
															<IconX className="size-4" />
														</Button>
													</div>
												) : (
													<FileDropzone
														value={attachmentFile}
														onChange={(file) => {
															setAttachmentFile(file);
															onAttachmentChange?.(file);
														}}
														accept={FILE_ACCEPT_ATTRIBUTE}
														maxSize={10}
													/>
												)}
											</>
										)}
									</div>
								</>
							)}

							<div className="border-t" />

							{/* Private Notes Section */}
							<div className="space-y-4">
								<div className="flex items-center gap-3">
									<IconLock className="size-5 text-muted-foreground" />
									<h2 className="text-lg font-semibold text-foreground">
										Private Notes
									</h2>
								</div>

								<form.AppField name="privateNotes">
									{(field) => (
										<field.TextareaField
											label="Confidential Notes (Optional)"
											rows={4}
											placeholder="Internal notes visible only to editors and admins..."
											className="text-foreground"
											description="Only visible to editors and administrators"
											disabled={readOnly}
										/>
									)}
								</form.AppField>
							</div>

							{/* Submit Section */}
							{!readOnly && (
								<div className="pt-4">
									<form.AppForm>
										<form.SubmitButton
											label="Submit Review"
											submittingLabel="Submitting Review..."
											disabled={!allComplete}
											className="w-full h-12 text-base font-semibold"
										/>
									</form.AppForm>
									{!allComplete && (
										<p className="text-xs text-muted-foreground text-center mt-2">
											Complete all required sections to submit
										</p>
									)}
								</div>
							)}
						</form>
					</div>
				</div>

				{/* Progress Sidebar */}
				<div className="hidden lg:block">
					<div className="sticky top-0 space-y-4">
						<div className="rounded-2xl bg-card shadow-2xl overflow-hidden">
							<div className="p-6 border-b border-border">
								<h3 className="font-semibold text-foreground">
									Review Progress
								</h3>
							</div>
							<div className="p-6 space-y-4">
								<ProgressItem
									label="Decision"
									completed={hasDecision}
									icon={IconScale}
								/>
								<ProgressItem
									label="Evaluation Scores"
									completed={hasScores}
									icon={IconStar}
								/>
								{enableConfidenceLevel && (
									<ProgressItem
										label="Confidence Level"
										completed={hasConfidence}
										icon={IconCircle}
									/>
								)}
								<ProgressItem
									label="Comments"
									completed={hasComments}
									icon={IconMessageCircle}
								/>
							</div>
						</div>

						{/* Guidelines Card */}
						<div className="rounded-2xl bg-card shadow-2xl overflow-hidden">
							<div className="p-6 border-b border-border">
								<h3 className="font-semibold text-foreground">
									Review Guidelines
								</h3>
							</div>
							<div className="p-6 text-sm text-muted-foreground">
								{guidelines ? (
									<Markdown content={guidelines} />
								) : (
									<div className="space-y-3">
										<p>• Provide constructive, specific feedback</p>
										<p>• Support claims with evidence from the work</p>
										<p>• Be respectful and professional</p>
										<p>• Consider the work's contribution to the field</p>
										<p>• Minimum 50 characters for comments</p>
									</div>
								)}
							</div>
						</div>
					</div>
				</div>

				{/* Mobile Progress */}
				<div className="lg:hidden">
					<div className="rounded-2xl bg-card shadow-2xl overflow-hidden">
						<div className="p-4 border-b border-border">
							<h3 className="font-semibold text-foreground text-sm">
								Review Progress
							</h3>
						</div>
						<div className="p-4 grid grid-cols-2 gap-3">
							<ProgressItem
								label="Decision"
								completed={hasDecision}
								icon={IconScale}
								compact
							/>
							<ProgressItem
								label="Scores"
								completed={hasScores}
								icon={IconStar}
								compact
							/>
							{enableConfidenceLevel && (
								<ProgressItem
									label="Confidence"
									completed={hasConfidence}
									icon={IconCircle}
									compact
								/>
							)}
							<ProgressItem
								label="Comments"
								completed={hasComments}
								icon={IconMessageCircle}
								compact
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

interface ProgressItemProps {
	label: string;
	completed: boolean;
	icon: React.ComponentType<{ className?: string }>;
	compact?: boolean;
}

function ProgressItem({
	label,
	completed,
	icon: Icon,
	compact = false,
}: ProgressItemProps) {
	if (compact) {
		return (
			<div className="flex items-center gap-2">
				{completed ? (
					<IconCircleCheck className="size-4 text-primary shrink-0" />
				) : (
					<IconCircle className="size-4 text-muted-foreground shrink-0" />
				)}
				<span
					className={cn(
						"text-xs",
						completed ? "text-foreground" : "text-muted-foreground",
					)}
				>
					{label}
				</span>
			</div>
		);
	}

	return (
		<div className="flex items-center gap-3">
			<div
				className={cn(
					"flex-shrink-0 p-2 rounded-md",
					completed ? "bg-primary/10" : "bg-muted",
				)}
			>
				{completed ? (
					<IconCircleCheck className="size-5 text-primary" />
				) : (
					<Icon className="size-5 text-muted-foreground" />
				)}
			</div>
			<div className="flex-1">
				<p
					className={cn(
						"font-medium text-sm",
						completed ? "text-foreground" : "text-muted-foreground",
					)}
				>
					{label}
				</p>
			</div>
		</div>
	);
}
