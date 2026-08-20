import type { UserSubmissionReview } from "@/features/submissions/api/submissions";

export interface ScoreColor {
	bar: string;
	text: string;
	bg: string;
}

/** Tailwind color config for a 0–5 score, banded green/blue/amber/red. */
export function getScoreColor(score: number): ScoreColor {
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

/** Responsive grid columns for the per-criterion score bars. */
export function scoreGridClassName(count: number): string {
	if (count >= 4) return "md:grid-cols-4";
	if (count >= 2) return "md:grid-cols-2";
	return "";
}

export interface ReviewSummary {
	scoreEntries: [string, number][];
	reviewAvg: number;
	createdAt: Date;
	hasComments: boolean;
	hasAttachment: boolean;
}

/** Per-review derived data: score entries, average, normalized date, flags. */
export function computeReviewSummary(
	review: UserSubmissionReview,
): ReviewSummary {
	const scoreEntries: [string, number][] = review.scores
		? Object.entries(review.scores)
		: [];
	const reviewAvg =
		scoreEntries.length > 0
			? scoreEntries.reduce((sum, [, v]) => sum + v, 0) / scoreEntries.length
			: 0;
	const createdAt =
		review.createdAt instanceof Date
			? review.createdAt
			: new Date(review.createdAt);
	return {
		scoreEntries,
		reviewAvg,
		createdAt,
		hasComments: !!review.comments,
		hasAttachment: !!review.attachment,
	};
}

/** Whether any review carries scores, and the average across all of them. */
export function computeReviewsAggregate(reviews: UserSubmissionReview[]) {
	const allScores = reviews.flatMap((r) =>
		r.scores ? Object.values(r.scores) : [],
	);
	const hasScores = allScores.length > 0;
	const avgScore = hasScores
		? allScores.reduce((sum, s) => sum + s, 0) / allScores.length
		: 0;
	return { hasScores, avgScore };
}
