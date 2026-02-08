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
	IconScale,
	IconStar,
	IconStarFilled,
	IconX,
} from "@tabler/icons-react";
import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ReviewDecision, SubmissionType } from "@/generated/prisma/enums";
import { typeLabels } from "@/lib/labels/submission";
import { cn } from "@/lib/utils";

interface SubmissionAuthor {
	firstName: string;
	lastName: string;
	affiliationName: string | null;
	isPresenter: boolean;
}

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
}

export interface ReviewFormData {
	decision: ReviewDecision;
	scoreNovelty: number;
	scoreMethodology: number;
	scoreClarity: number;
	scoreRelevance: number;
	confidenceLevel: number;
	comments: string;
	privateNotes: string;
}

const decisionOptions = [
	{
		value: "ACCEPT" as const,
		label: "Accept",
		description: "Work meets all criteria and should be accepted",
		icon: IconCheck,
		color: "emerald",
	},
	{
		value: "ACCEPT_WITH_MINOR_REVISIONS" as const,
		label: "Accept with Minor Revisions",
		description: "Good work, needs small improvements",
		icon: IconCircleCheck,
		color: "sky",
	},
	{
		value: "REVISE_AND_RESUBMIT" as const,
		label: "Revise and Resubmit",
		description: "Potential but requires significant changes",
		icon: IconAlertCircle,
		color: "amber",
	},
	{
		value: "REJECT" as const,
		label: "Reject",
		description: "Work does not meet publication standards",
		icon: IconX,
		color: "red",
	},
];

const scoreCriteria = [
	{
		key: "scoreNovelty" as const,
		label: "Novelty & Originality",
		description: "Contribution to the field",
	},
	{
		key: "scoreMethodology" as const,
		label: "Methodology & Rigor",
		description: "Research design and execution",
	},
	{
		key: "scoreClarity" as const,
		label: "Clarity & Presentation",
		description: "Writing quality and structure",
	},
	{
		key: "scoreRelevance" as const,
		label: "Relevance & Impact",
		description: "Significance to conference audience",
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
}: ReviewFormProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [contentExpanded, setContentExpanded] = useState(false);

	const form = useForm({
		defaultValues: {
			decision: initialData?.decision || ("ACCEPT" as ReviewDecision),
			scoreNovelty: initialData?.scoreNovelty || 3,
			scoreMethodology: initialData?.scoreMethodology || 3,
			scoreClarity: initialData?.scoreClarity || 3,
			scoreRelevance: initialData?.scoreRelevance || 3,
			confidenceLevel: initialData?.confidenceLevel || 3,
			comments: initialData?.comments || "",
			privateNotes: initialData?.privateNotes || "",
		},
		onSubmit: async ({ value }) => {
			setIsSubmitting(true);
			try {
				await onSubmit(value);
			} finally {
				setIsSubmitting(false);
			}
		},
	});

	const values = form.state.values;

	// Progress indicators
	const hasDecision = !!values.decision;
	const hasScores =
		values.scoreNovelty > 0 &&
		values.scoreMethodology > 0 &&
		values.scoreClarity > 0 &&
		values.scoreRelevance > 0;
	const hasConfidence = values.confidenceLevel > 0;
	const hasComments = values.comments.length >= 50;

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
								form.handleSubmit();
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
									{(field) => (
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
											{decisionOptions.map((option) => {
												const Icon = option.icon;
												const isSelected = field.state.value === option.value;
												return (
													<button
														key={option.value}
														type="button"
														onClick={() => field.handleChange(option.value)}
														className={cn(
															"flex flex-col gap-2 p-4 rounded-lg border-2 transition-all text-left",
															isSelected
																? "border-primary bg-primary/5"
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
									)}
								</form.Field>
							</div>

							<div className="border-t" />

							{/* Scoring Section */}
							<div className="space-y-4">
								<div className="flex items-center gap-3">
									<IconStar className="size-5 text-muted-foreground" />
									<h2 className="text-lg font-semibold text-foreground">
										Evaluation Criteria
									</h2>
								</div>

								<div className="space-y-6">
									{scoreCriteria.map((criterion) => (
										<form.Field key={criterion.key} name={criterion.key}>
											{(field) => (
												<div className="space-y-3">
													<div>
														<Label className="text-foreground font-medium">
															{criterion.label}
														</Label>
														<p className="text-xs text-muted-foreground mt-0.5">
															{criterion.description}
														</p>
													</div>
													<div className="flex items-center gap-2">
														{[1, 2, 3, 4, 5].map((score) => (
															<button
																key={score}
																type="button"
																onClick={() => field.handleChange(score)}
																className={cn(
																	"flex-1 h-12 rounded-lg border-2 transition-all font-medium",
																	field.state.value === score
																		? "border-primary bg-primary text-primary-foreground shadow-sm"
																		: "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground",
																)}
															>
																{score}
															</button>
														))}
													</div>
													<div className="flex justify-between text-xs text-muted-foreground px-1">
														<span>Poor</span>
														<span>Excellent</span>
													</div>
												</div>
											)}
										</form.Field>
									))}
								</div>
							</div>

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
									{(field) => (
										<div className="space-y-2">
											<div className="flex items-center gap-2">
												{confidenceLevels.map((level) => (
													<button
														key={level.value}
														type="button"
														onClick={() => field.handleChange(level.value)}
														className={cn(
															"flex-1 h-12 rounded-lg border-2 transition-all font-medium text-sm",
															field.state.value === level.value
																? "border-primary bg-primary text-primary-foreground shadow-sm"
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
													{confidenceLevels[field.state.value - 1].label}:{" "}
													<span className="text-muted-foreground">
														{
															confidenceLevels[field.state.value - 1]
																.description
														}
													</span>
												</p>
											)}
										</div>
									)}
								</form.Field>
							</div>

							<div className="border-t" />

							{/* Comments Section */}
							<div className="space-y-4">
								<div className="flex items-center gap-3">
									<IconMessageCircle className="size-5 text-muted-foreground" />
									<h2 className="text-lg font-semibold text-foreground">
										Comments to Authors
									</h2>
								</div>

								<form.Field name="comments">
									{(field) => (
										<div className="space-y-2">
											<div className="flex items-center justify-between">
												<Label htmlFor="comments" className="text-foreground">
													Review Comments
												</Label>
												<span
													className={cn(
														"text-xs",
														field.state.value.length >= 50
															? "text-muted-foreground"
															: "text-destructive",
													)}
												>
													{field.state.value.length} characters
													{field.state.value.length < 50 &&
														` (min. 50 required)`}
												</span>
											</div>
											<Textarea
												id="comments"
												name="comments"
												value={field.state.value}
												onChange={(e) => field.handleChange(e.target.value)}
												onBlur={field.handleBlur}
												rows={10}
												placeholder="Provide detailed feedback on the submission's strengths, weaknesses, and suggestions for improvement..."
												className="resize-none text-foreground"
											/>
											<p className="text-xs text-muted-foreground">
												These comments will be visible to the authors.
											</p>
										</div>
									)}
								</form.Field>
							</div>

							<div className="border-t" />

							{/* Private Notes Section */}
							<div className="space-y-4">
								<div className="flex items-center gap-3">
									<IconLock className="size-5 text-muted-foreground" />
									<h2 className="text-lg font-semibold text-foreground">
										Private Notes
									</h2>
								</div>

								<form.Field name="privateNotes">
									{(field) => (
										<div className="space-y-2">
											<div className="flex items-center justify-between">
												<Label
													htmlFor="privateNotes"
													className="text-foreground"
												>
													Confidential Notes{" "}
													<span className="text-muted-foreground text-xs font-normal">
														(Optional)
													</span>
												</Label>
											</div>
											<Textarea
												id="privateNotes"
												name="privateNotes"
												value={field.state.value}
												onChange={(e) => field.handleChange(e.target.value)}
												onBlur={field.handleBlur}
												rows={4}
												placeholder="Internal notes visible only to editors and admins..."
												className="resize-none text-foreground"
											/>
											<p className="text-xs text-muted-foreground">
												Only visible to editors and administrators.
											</p>
										</div>
									)}
								</form.Field>
							</div>

							{/* Submit Section */}
							<div className="pt-4">
								<Button
									type="submit"
									disabled={isSubmitting || !allComplete}
									className="w-full h-12 text-base font-semibold"
								>
									{isSubmitting ? "Submitting Review..." : "Submit Review"}
								</Button>
								{!allComplete && (
									<p className="text-xs text-muted-foreground text-center mt-2">
										Complete all required sections to submit
									</p>
								)}
							</div>
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
								<ProgressItem
									label="Confidence Level"
									completed={hasConfidence}
									icon={IconCircle}
								/>
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
							<div className="p-6 space-y-3 text-sm text-muted-foreground">
								<p>• Provide constructive, specific feedback</p>
								<p>• Support claims with evidence from the work</p>
								<p>• Be respectful and professional</p>
								<p>• Consider the work's contribution to the field</p>
								<p>• Minimum 50 characters for comments</p>
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
							<ProgressItem
								label="Confidence"
								completed={hasConfidence}
								icon={IconCircle}
								compact
							/>
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
