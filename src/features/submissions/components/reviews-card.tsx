import {
	IconDownload,
	IconMessageCircle,
	IconPaperclip,
	IconStarFilled,
} from "@tabler/icons-react";
import type { UserSubmissionReview } from "@/features/submissions/api/submissions";
import {
	computeReviewSummary,
	computeReviewsAggregate,
	getScoreColor,
	scoreGridClassName,
} from "@/features/submissions/components/reviews-card-helpers";
import { useDateFormat } from "@/shared/hooks/use-date-format";
import { cn, formatFileSize } from "@/shared/lib/utils";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/shared/ui/accordion";
import { Badge } from "@/shared/ui/badge";

interface ReviewsCardProps {
	reviews: UserSubmissionReview[];
	round?: number;
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

function ReviewTriggerHeader({
	reviewerName,
	hasScores,
	reviewAvg,
	scoreText,
	hasComments,
	hasAttachment,
}: {
	reviewerName: string;
	hasScores: boolean;
	reviewAvg: number;
	scoreText: string;
	hasComments: boolean;
	hasAttachment: boolean;
}) {
	return (
		<div className="flex items-center gap-3 flex-wrap">
			<span className="font-medium text-foreground">{reviewerName}</span>
			{hasScores && (
				<Badge variant="outline" className={cn("font-semibold", scoreText)}>
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
	);
}

function ReviewScores({ scoreEntries }: { scoreEntries: [string, number][] }) {
	if (scoreEntries.length === 0) return null;
	return (
		<div
			className={cn(
				"grid grid-cols-1 gap-3",
				scoreGridClassName(scoreEntries.length),
			)}
		>
			{scoreEntries.map(([name, score]) => (
				<ScoreBar key={name} label={name} score={score} />
			))}
		</div>
	);
}

function ReviewComments({
	comments,
	hasScores,
}: {
	comments: string | null;
	hasScores: boolean;
}) {
	if (comments) {
		return (
			<div className={cn(hasScores && "pt-3 border-t")}>
				<p className="text-sm font-medium text-muted-foreground mb-2">
					Comments
				</p>
				<div className="text-sm text-foreground leading-relaxed bg-background/50 p-3 rounded-lg border">
					{comments}
				</div>
			</div>
		);
	}
	if (!hasScores) {
		return (
			<p className="text-sm text-muted-foreground italic">
				No detailed feedback provided.
			</p>
		);
	}
	return null;
}

function ReviewAttachment({
	attachment,
}: {
	attachment: UserSubmissionReview["attachment"];
}) {
	if (!attachment) return null;
	return (
		<div className="pt-3 border-t">
			<p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
				<IconPaperclip className="size-3.5" />
				Attachment
			</p>
			<a
				href={`/api/files/${attachment.id}`}
				className="inline-flex items-center gap-2 text-sm text-primary hover:underline bg-background/50 p-2 rounded-lg border"
			>
				<IconDownload className="size-4" />
				{attachment.originalName}
				<span className="text-xs text-muted-foreground">
					({formatFileSize(attachment.size)})
				</span>
			</a>
		</div>
	);
}

function ReviewItem({
	review,
	formatDateTime,
}: {
	review: UserSubmissionReview;
	formatDateTime: (date: Date) => string;
}) {
	const { scoreEntries, reviewAvg, createdAt, hasComments, hasAttachment } =
		computeReviewSummary(review);
	const hasScores = scoreEntries.length > 0;
	const scoreConfig = getScoreColor(reviewAvg);

	return (
		<AccordionItem
			value={review.id}
			className="border border-border rounded-xl bg-muted hover:bg-muted/80 transition-colors shadow-sm"
		>
			<AccordionTrigger className="px-4 py-3 hover:no-underline">
				<ReviewTriggerHeader
					reviewerName={review.reviewerName}
					hasScores={hasScores}
					reviewAvg={reviewAvg}
					scoreText={scoreConfig.text}
					hasComments={hasComments}
					hasAttachment={hasAttachment}
				/>
			</AccordionTrigger>
			<AccordionContent className="px-4 pb-4 pt-1">
				<div className="space-y-4">
					<ReviewScores scoreEntries={scoreEntries} />
					<ReviewComments comments={review.comments} hasScores={hasScores} />
					<ReviewAttachment attachment={review.attachment} />
					<div className="text-xs text-muted-foreground pt-2">
						{formatDateTime(createdAt)}
					</div>
				</div>
			</AccordionContent>
		</AccordionItem>
	);
}

export function ReviewsCard({ reviews, round = 1 }: ReviewsCardProps) {
	const { formatDateTime } = useDateFormat();
	if (reviews.length === 0) {
		return null;
	}

	const { hasScores, avgScore } = computeReviewsAggregate(reviews);
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
					{reviews.map((review) => (
						<ReviewItem
							key={review.id}
							review={review}
							formatDateTime={formatDateTime}
						/>
					))}
				</Accordion>
			</div>
		</div>
	);
}
