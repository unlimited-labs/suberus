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

	const rounds = [...new Set(reviews.map((r) => r.round))].sort(
		(a, b) => b - a,
	);
	const filteredReviews =
		selectedRound === "all"
			? reviews
			: reviews.filter((r) => r.round === Number(selectedRound));
	const groupedByRound = rounds.flatMap((round) =>
		selectedRound === "all" || round === Number(selectedRound)
			? [{ round, reviews: filteredReviews.filter((r) => r.round === round) }]
			: [],
	);

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<div className="flex items-center gap-3">
					<IconMessageCircle className="text-muted-foreground size-5" />
					<h2 className="text-lg font-semibold">Reviews</h2>
					<span className="text-muted-foreground text-sm">
						({reviews.length})
					</span>
				</div>
				{rounds.length > 1 && (
					<div className="flex items-center gap-2">
						<IconFilter className="text-muted-foreground size-4" />
						<Select
							items={[
								{ value: "all", label: "All rounds" },
								...rounds.map((round) => ({
									value: round.toString(),
									label: `Round ${round}`,
								})),
							]}
							onValueChange={setSelectedRound}
							value={selectedRound}
						>
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
					<div className="space-y-4" key={round}>
						{versionComment && (
							<SectionCard
								icon={IconEdit}
								title={`Author's revision notes – Version ${round}`}
								variant="elevated"
							>
								<div className="text-foreground bg-muted/50 rounded-lg border p-3 text-sm leading-relaxed">
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
