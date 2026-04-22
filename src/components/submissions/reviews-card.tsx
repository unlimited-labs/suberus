import {
	IconDownload,
	IconMessageCircle,
	IconPaperclip,
	IconStarFilled,
} from "@tabler/icons-react";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { useDateFormat } from "@/hooks/use-date-format";
import { cn, formatFileSize } from "@/lib/utils";
import type { UserSubmissionReview } from "@/server-fns/submissions";

interface ReviewsCardProps {
	reviews: UserSubmissionReview[];
	round?: number;
}

function getScoreColor(score: number): {
	bar: string;
	text: string;
	bg: string;
} {
	if (score >= 4.5) {
		return {
			bar: "bg-emerald-500",
			text: "text-emerald-600 dark:text-emerald-400",
			bg: "bg-emerald-500/10 border-emerald-500/20",
		};
	}
	if (score >= 3.5) {
		return {
			bar: "bg-sky-500",
			text: "text-sky-600 dark:text-sky-400",
			bg: "bg-sky-500/10 border-sky-500/20",
		};
	}
	if (score >= 2.5) {
		return {
			bar: "bg-amber-500",
			text: "text-amber-600 dark:text-amber-400",
			bg: "bg-amber-500/10 border-amber-500/20",
		};
	}
	return {
		bar: "bg-red-500",
		text: "text-red-600 dark:text-red-400",
		bg: "bg-red-500/10 border-red-500/20",
	};
}

interface ScoreBarProps {
	label: string;
	score: number | null;
	maxScore?: number;
}

function ScoreBar({ label, score, maxScore = 5 }: ScoreBarProps) {
	if (score === null) return null;

	const percentage = (score / maxScore) * 100;
	const colorConfig = getScoreColor(score);

	return (
		<div>
			<div className="flex justify-between items-center mb-1.5">
				<span className="text-sm text-muted-foreground">{label}</span>
				<span className={cn("text-sm font-semibold", colorConfig.text)}>
					{score}/{maxScore}
				</span>
			</div>
			<div className="h-2 bg-muted rounded-full overflow-hidden">
				<div
					className={cn(
						"h-full transition-all duration-500 ease-out rounded-full",
						colorConfig.bar,
					)}
					style={{ width: `${percentage}%` }}
				/>
			</div>
		</div>
	);
}

export function ReviewsCard({ reviews, round = 1 }: ReviewsCardProps) {
	const { formatDateTime } = useDateFormat();
	if (reviews.length === 0) {
		return null;
	}

	const allScores = reviews.flatMap((r) =>
		r.scores ? Object.values(r.scores) : [],
	);
	const hasScores = allScores.length > 0;
	const avgScore = hasScores
		? allScores.reduce((sum, s) => sum + s, 0) / allScores.length
		: 0;
	const avgColorConfig = getScoreColor(avgScore);

	return (
		<div
			id="reviews-section"
			className="rounded-2xl bg-card shadow-2xl border p-8"
		>
			<div className="space-y-4">
				{/* Header */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<IconMessageCircle className="size-5 text-muted-foreground" />
						<h2 className="text-lg font-semibold text-foreground">
							Reviews – Round {round}
						</h2>
					</div>
					<span className="text-sm text-muted-foreground">
						{reviews.length} {reviews.length === 1 ? "review" : "reviews"}
					</span>
				</div>

				{/* Average Score Card — only when scoring is enabled */}
				{hasScores && (
					<div
						className={cn(
							"flex items-center justify-between p-4 rounded-xl border",
							avgColorConfig.bg,
						)}
					>
						<div className="flex items-center gap-2">
							<IconStarFilled className="size-4 text-muted-foreground" />
							<span className="text-sm text-muted-foreground">
								Average score
							</span>
						</div>
						<span className={cn("text-xl font-bold", avgColorConfig.text)}>
							{avgScore.toFixed(2)}/5
						</span>
					</div>
				)}

				{/* Reviews */}
				<Accordion type="single" collapsible className="space-y-3">
					{reviews.map((review) => {
						const scoreEntries = review.scores
							? Object.entries(review.scores)
							: [];
						const reviewAvg =
							scoreEntries.length > 0
								? scoreEntries.reduce((sum, [, v]) => sum + v, 0) /
									scoreEntries.length
								: 0;
						const scoreConfig = getScoreColor(reviewAvg);
						const createdAt =
							typeof review.createdAt === "string"
								? new Date(review.createdAt)
								: review.createdAt;
						const hasComments = !!review.comments;
						const hasAttachment = !!review.attachment;

						return (
							<AccordionItem
								key={review.id}
								value={review.id}
								className="border border-border rounded-xl bg-muted hover:bg-muted/80 transition-colors shadow-sm"
							>
								<AccordionTrigger className="px-4 py-3 hover:no-underline">
									<div className="flex items-center gap-3 flex-wrap">
										<span className="font-medium text-foreground">
											{review.reviewerName}
										</span>
										{scoreEntries.length > 0 && (
											<Badge
												variant="outline"
												className={cn("font-semibold", scoreConfig.text)}
											>
												{reviewAvg.toFixed(1)}/5
											</Badge>
										)}
										{hasComments && (
											<IconMessageCircle className="size-3.5 text-muted-foreground" />
										)}
										{hasAttachment && (
											<IconPaperclip className="size-3.5 text-muted-foreground" />
										)}
									</div>
								</AccordionTrigger>
								<AccordionContent className="px-4 pb-4 pt-1">
									<div className="space-y-4">
										{/* Scores */}
										{scoreEntries.length > 0 && (
											<div
												className={cn(
													"grid grid-cols-1 gap-3",
													scoreEntries.length >= 4
														? "md:grid-cols-4"
														: scoreEntries.length >= 2
															? "md:grid-cols-2"
															: "",
												)}
											>
												{scoreEntries.map(([name, score]) => (
													<ScoreBar key={name} label={name} score={score} />
												))}
											</div>
										)}

										{/* Comments */}
										{review.comments && (
											<div
												className={cn(
													scoreEntries.length > 0 ? "pt-3 border-t" : "",
												)}
											>
												<p className="text-sm font-medium text-muted-foreground mb-2">
													Comments
												</p>
												<div className="text-sm text-foreground leading-relaxed bg-background/50 p-3 rounded-lg border">
													{review.comments}
												</div>
											</div>
										)}

										{/* No content fallback */}
										{!review.comments && scoreEntries.length === 0 && (
											<p className="text-sm text-muted-foreground italic">
												No detailed feedback provided.
											</p>
										)}

										{/* Attachment */}
										{review.attachment && (
											<div className="pt-3 border-t">
												<p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
													<IconPaperclip className="size-3.5" />
													Attachment
												</p>
												<a
													href={`/api/files/${review.attachment.id}`}
													className="inline-flex items-center gap-2 text-sm text-primary hover:underline bg-background/50 p-2 rounded-lg border"
												>
													<IconDownload className="size-4" />
													{review.attachment.originalName}
													<span className="text-xs text-muted-foreground">
														({formatFileSize(review.attachment.size)})
													</span>
												</a>
											</div>
										)}

										{/* Review Date */}
										<div className="text-xs text-muted-foreground pt-2">
											{formatDateTime(createdAt)}
										</div>
									</div>
								</AccordionContent>
							</AccordionItem>
						);
					})}
				</Accordion>
			</div>
		</div>
	);
}
