import { IconGavel } from "@tabler/icons-react";
import { useState } from "react";

import { Card, CardContent } from "@/shared/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/ui/select";

import {
	type EditorReview,
	filterReviewsByRound,
	getReviewRounds,
} from "./availability";
import { ReviewCard } from "./review-card";

interface ReviewsTabProps {
	reviews: EditorReview[];
	currentRound: number;
	enableScoring: boolean;
	enableConfidenceLevel: boolean;
}

export function ReviewsTab({
	reviews,
	currentRound,
	enableScoring,
	enableConfidenceLevel,
}: ReviewsTabProps) {
	const [selectedReviewRound, setSelectedReviewRound] =
		useState<string>("current");

	const allReviewRounds = getReviewRounds(reviews);
	const displayedReviews = filterReviewsByRound(
		reviews,
		selectedReviewRound,
		currentRound,
	);

	return (
		<>
			{allReviewRounds.length > 1 && (
				<div className="flex items-center gap-2">
					<Select
						value={selectedReviewRound}
						onValueChange={setSelectedReviewRound}
					>
						<SelectTrigger className="w-[180px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="current">
								Current round ({currentRound})
							</SelectItem>
							<SelectItem value="all">All rounds</SelectItem>
							{allReviewRounds.map((round) => (
								<SelectItem key={round} value={round.toString()}>
									Round {round}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			)}

			{displayedReviews.length === 0 ? (
				<Card>
					<CardContent className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
						<IconGavel className="size-8 opacity-40" />
						<p className="text-sm">No reviews submitted yet</p>
					</CardContent>
				</Card>
			) : (
				displayedReviews.map((review) => (
					<ReviewCard
						key={review.id}
						review={review}
						showRound={allReviewRounds.length > 1}
						enableScoring={enableScoring}
						enableConfidenceLevel={enableConfidenceLevel}
					/>
				))
			)}
		</>
	);
}
