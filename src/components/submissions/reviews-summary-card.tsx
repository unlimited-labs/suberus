import { IconArrowRight, IconMessageCircle } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UserSubmissionReview } from "@/utils/submissions.functions";

interface ReviewsSummaryCardProps {
	reviews: UserSubmissionReview[];
	submissionId: string;
}

function getScoreColor(score: number): {
	text: string;
	bg: string;
} {
	if (score >= 4.5) {
		return {
			text: "text-emerald-600 dark:text-emerald-400",
			bg: "bg-emerald-500/10 border-emerald-500/20",
		};
	}
	if (score >= 3.5) {
		return {
			text: "text-sky-600 dark:text-sky-400",
			bg: "bg-sky-500/10 border-sky-500/20",
		};
	}
	if (score >= 2.5) {
		return {
			text: "text-amber-600 dark:text-amber-400",
			bg: "bg-amber-500/10 border-amber-500/20",
		};
	}
	return {
		text: "text-red-600 dark:text-red-400",
		bg: "bg-red-500/10 border-red-500/20",
	};
}

export function ReviewsSummaryCard({
	reviews,
	submissionId,
}: ReviewsSummaryCardProps) {
	if (reviews.length === 0) {
		return null;
	}

	const rounds = [...new Set(reviews.map((r) => r.round))];
	const latestRound = Math.max(...rounds);
	const latestRoundReviews = reviews.filter((r) => r.round === latestRound);

	// Calculate average from available scores
	const allScores = reviews.flatMap((r) =>
		r.scores ? Object.values(r.scores) : [],
	);
	const avgScore =
		allScores.length > 0
			? allScores.reduce((sum, s) => sum + s, 0) / allScores.length
			: 0;
	const avgColorConfig = getScoreColor(avgScore);

	return (
		<div className="rounded-2xl bg-card shadow-2xl border p-6">
			<div className="flex items-center justify-between gap-4 flex-wrap">
				<div className="flex items-center gap-3">
					<IconMessageCircle className="size-5 text-muted-foreground" />
					<h2 className="text-lg font-semibold text-foreground">Reviews</h2>
				</div>
				<Link to="/submissions/$id/reviews" params={{ id: submissionId }}>
					<Button variant="outline" size="sm" className="gap-2">
						View All
						<IconArrowRight className="size-4" />
					</Button>
				</Link>
			</div>

			<div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
				{/* Total reviews */}
				<div className="p-3 rounded-xl bg-muted/50 border">
					<p className="text-xs text-muted-foreground">Total</p>
					<p className="text-xl font-bold text-foreground">{reviews.length}</p>
					<p className="text-xs text-muted-foreground">
						{reviews.length === 1 ? "review" : "reviews"}
					</p>
				</div>

				{/* Average score */}
				<div className={cn("p-3 rounded-xl border", avgColorConfig.bg)}>
					<p className="text-xs text-muted-foreground">Average Score</p>
					<p className={cn("text-xl font-bold", avgColorConfig.text)}>
						{avgScore.toFixed(2)}/5
					</p>
					<p className="text-xs text-muted-foreground">all rounds</p>
				</div>

				{/* Latest round */}
				<div className="p-3 rounded-xl bg-muted/50 border">
					<p className="text-xs text-muted-foreground">Latest Round</p>
					<p className="text-xl font-bold text-foreground">{latestRound}</p>
					<p className="text-xs text-muted-foreground">
						{latestRoundReviews.length}{" "}
						{latestRoundReviews.length === 1 ? "review" : "reviews"}
					</p>
				</div>
			</div>
		</div>
	);
}
