import {
	Accordion,
	AccordionItem,
	AccordionTrigger,
	AccordionContent,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { IconMessageCircle } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import type { MockReview } from "@/lib/mock-data/submissions";

interface ReviewsCardProps {
	reviews: MockReview[];
	round?: number;
}

// Helper function to get color class based on score - unified color scheme
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
	score: number;
	maxScore?: number;
}

function ScoreBar({ label, score, maxScore = 5 }: ScoreBarProps) {
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
	if (reviews.length === 0) {
		return null;
	}

	// Calculate average score
	const avgScore =
		reviews.reduce((sum, r) => sum + r.scores.overall, 0) / reviews.length;
	const avgColorConfig = getScoreColor(avgScore);

	return (
		<div id="reviews-section" className="rounded-2xl bg-card shadow-2xl border p-8">
			<div className="space-y-4">
				{/* Header */}
				<div className="flex items-center gap-3">
					<IconMessageCircle className="size-5 text-muted-foreground" />
					<h2 className="text-lg font-semibold text-foreground">
						Reviews – Round {round}
					</h2>
				</div>

				{/* Average Score Card */}
				<div
					className={cn(
						"flex items-center justify-between p-4 rounded-xl border",
						avgColorConfig.bg,
					)}
				>
					<span className="text-sm text-muted-foreground">
						Average score ({reviews.length} {reviews.length === 1 ? "review" : "reviews"})
					</span>
					<span className={cn("text-xl font-bold", avgColorConfig.text)}>
						{avgScore.toFixed(2)}/5
					</span>
				</div>

				{/* Reviews Accordion */}
				<Accordion type="single" collapsible className="space-y-3">
					{reviews.map((review) => {
						const scoreConfig = getScoreColor(review.scores.overall);
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
										<Badge
											variant="outline"
											className={cn("font-semibold", scoreConfig.text)}
										>
											{review.scores.overall.toFixed(1)}/5
										</Badge>
									</div>
								</AccordionTrigger>
								<AccordionContent className="px-4 pb-4 pt-1">
									<div className="space-y-4">
										{/* Scores - horizontal on desktop */}
										<div className="grid grid-cols-1 md:grid-cols-4 gap-3">
											<ScoreBar
												label="Originality"
												score={review.scores.originality}
											/>
											<ScoreBar label="Clarity" score={review.scores.clarity} />
											<ScoreBar label="Significance" score={review.scores.significance} />
											<ScoreBar label="Overall" score={review.scores.overall} />
										</div>

										{/* Comments */}
										<div className="pt-3 border-t">
											<p className="text-sm font-medium text-muted-foreground mb-2">
												Comments
											</p>
											<div className="text-sm text-foreground leading-relaxed bg-background/50 p-3 rounded-lg border">
												{review.comments}
											</div>
										</div>

										{/* Review Date */}
										<div className="text-xs text-muted-foreground pt-2">
											{review.createdAt.toLocaleDateString("en-US", {
												day: "2-digit",
												month: "short",
												year: "numeric",
												hour: "2-digit",
												minute: "2-digit",
											})}
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
