import { IconEdit, IconFilter, IconMessageCircle } from "@tabler/icons-react";
import { useState } from "react";
import { ReviewsCard } from "@/features/submissions/components/reviews-card";
import type { SubmissionDetail } from "@/features/submissions/server/submissions";
import { SectionCard } from "@/shared/ui/section-card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/ui/select";

interface SubmissionReviewsSectionProps {
	reviews: SubmissionDetail["reviews"];
	versions: SubmissionDetail["versions"];
}

export function SubmissionReviewsSection({
	reviews,
	versions,
}: SubmissionReviewsSectionProps) {
	const [selectedRound, setSelectedRound] = useState<string>("all");

	// Reviews grouped by round
	const rounds = [...new Set(reviews.map((r) => r.round))].sort(
		(a, b) => b - a,
	);
	const filteredReviews =
		selectedRound === "all"
			? reviews
			: reviews.filter((r) => r.round === Number(selectedRound));
	const groupedByRound = rounds
		.filter((round) =>
			selectedRound === "all" ? true : round === Number(selectedRound),
		)
		.map((round) => ({
			round,
			reviews: filteredReviews.filter((r) => r.round === round),
		}));

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between flex-wrap gap-4">
				<div className="flex items-center gap-3">
					<IconMessageCircle className="size-5 text-muted-foreground" />
					<h2 className="text-lg font-semibold">Reviews</h2>
					<span className="text-sm text-muted-foreground">
						({reviews.length})
					</span>
				</div>
				{rounds.length > 1 && (
					<div className="flex items-center gap-2">
						<IconFilter className="size-4 text-muted-foreground" />
						<Select value={selectedRound} onValueChange={setSelectedRound}>
							<SelectTrigger className="w-[140px]">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All rounds</SelectItem>
								{rounds.map((round) => (
									<SelectItem key={round} value={round.toString()}>
										Round {round}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				)}
			</div>
			{groupedByRound.map(({ round, reviews: roundReviews }) => {
				const versionComment = versions.find(
					(v) => v.version === round && v.comment,
				);
				return (
					<div key={round} className="space-y-4">
						{versionComment && (
							<SectionCard
								variant="elevated"
								icon={IconEdit}
								title={`Author's revision notes – Version ${round}`}
							>
								<div className="text-sm text-foreground leading-relaxed bg-muted/50 p-3 rounded-lg border">
									{versionComment.comment}
								</div>
							</SectionCard>
						)}
						<ReviewsCard reviews={roundReviews} round={round} />
					</div>
				);
			})}
		</div>
	);
}
