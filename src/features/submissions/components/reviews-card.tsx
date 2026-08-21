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
import { SectionCard } from "@/shared/ui/section-card";

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
			<div className="mb-1.5 flex items-center justify-between">
				<span className="text-muted-foreground text-sm">{label}</span>
				<span className={cn("text-sm font-semibold", colorConfig.text)}>
					{score}/{maxScore}
				</span>
			</div>
			<div className="bg-muted h-2 overflow-hidden rounded-full">
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
		<div className="flex flex-wrap items-center gap-3">
			<span className="text-foreground font-medium">{reviewerName}</span>
			{hasScores && (
				<Badge className={cn("font-semibold", scoreText)} variant="outline">
					{reviewAvg.toFixed(1)}/5
				</Badge>
			)}
			{hasComments && (
				<IconMessageCircle className="text-muted-foreground size-3.5" />
			)}
			{hasAttachment && (
				<IconPaperclip className="text-muted-foreground size-3.5" />
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
				<p className="text-muted-foreground mb-2 text-sm font-medium">
					Comments
				</p>
				<div className="text-foreground bg-background/50 rounded-lg border p-3 text-sm leading-relaxed">
					{comments}
				</div>
			</div>
		);
	}
	if (!hasScores) {
		return (
			<p className="text-muted-foreground text-sm italic">
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
		<div className="border-t pt-3">
			<p className="text-muted-foreground mb-2 flex items-center gap-1.5 text-sm font-medium">
				<IconPaperclip className="size-3.5" />
				Attachment
			</p>
			<a
				className="text-primary bg-background/50 inline-flex items-center gap-2 rounded-lg border p-2 text-sm hover:underline"
				href={`/api/files/${attachment.id}`}
			>
				<IconDownload className="size-4" />
				{attachment.originalName}
				<span className="text-muted-foreground text-xs">
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
			className="border-border bg-muted hover:bg-muted/80 rounded-xl border shadow-sm transition-colors"
			value={review.id}
		>
			<AccordionTrigger className="px-4 py-3 hover:no-underline">
				<ReviewTriggerHeader
					hasAttachment={hasAttachment}
					hasComments={hasComments}
					hasScores={hasScores}
					reviewAvg={reviewAvg}
					reviewerName={review.reviewerName}
					scoreText={scoreConfig.text}
				/>
			</AccordionTrigger>
			<AccordionContent className="px-4 pt-1 pb-4">
				<div className="space-y-4">
					<ReviewScores scoreEntries={scoreEntries} />
					<ReviewComments comments={review.comments} hasScores={hasScores} />
					<ReviewAttachment attachment={review.attachment} />
					<div className="text-muted-foreground pt-2 text-xs">
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
		<div id="reviews-section">
			<SectionCard
				action={
					<span className="text-muted-foreground text-sm">
						{reviews.length} {reviews.length === 1 ? "review" : "reviews"}
					</span>
				}
				icon={IconMessageCircle}
				title={`Reviews – Round ${round}`}
				variant="elevated"
			>
				<div className="space-y-4">
					{hasScores && (
						<div
							className={cn(
								"flex items-center justify-between p-4 rounded-xl border",
								avgColorConfig.bg,
							)}
						>
							<div className="flex items-center gap-2">
								<IconStarFilled className="text-muted-foreground size-4" />
								<span className="text-muted-foreground text-sm">
									Average score
								</span>
							</div>
							<span className={cn("text-xl font-bold", avgColorConfig.text)}>
								{avgScore.toFixed(2)}/5
							</span>
						</div>
					)}

					<Accordion className="space-y-3">
						{reviews.map((review) => (
							<ReviewItem
								formatDateTime={formatDateTime}
								key={review.id}
								review={review}
							/>
						))}
					</Accordion>
				</div>
			</SectionCard>
		</div>
	);
}
