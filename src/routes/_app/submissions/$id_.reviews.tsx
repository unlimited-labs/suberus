import {
	IconArrowLeft,
	IconFilter,
	IconMessageCircle,
} from "@tabler/icons-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ReviewsCard } from "@/components/submissions/reviews-card";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { getSubmissionByIdFn } from "@/utils/submissions.functions";

export const Route = createFileRoute("/_app/submissions/$id_/reviews")({
	loader: async ({ params }) => {
		const data = await getSubmissionByIdFn({ data: { submissionId: params.id } });
		return { data };
	},
	component: SubmissionReviewsPage,
});

function SubmissionReviewsPage() {
	const { id } = Route.useParams();
	const { data } = Route.useLoaderData();

	const [selectedRound, setSelectedRound] = useState<string>("all");

	if (!data) {
		return (
			<div className="flex h-full flex-col">
				<PageHeader icon={IconMessageCircle} title="Reviews" />
				<div className="flex-1 p-6 flex items-center justify-center">
					<div className="text-center">
						<p className="text-muted-foreground mb-4">
							Submission with ID: {id} not found
						</p>
						<Link to="/submissions">
							<Button variant="outline" className="gap-2">
								<IconArrowLeft className="size-4" />
								Back to List
							</Button>
						</Link>
					</div>
				</div>
			</div>
		);
	}

	const { submission, reviews } = data;
	const rounds = [...new Set(reviews.map((r) => r.round))].sort((a, b) => b - a);

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
		<div className="flex h-full flex-col">
			<PageHeader icon={IconMessageCircle} title="Reviews">
				<Link to="/submissions/$id" params={{ id }}>
					<Button variant="outline" className="gap-2">
						<IconArrowLeft className="size-4" />
						Back to Submission
					</Button>
				</Link>
			</PageHeader>
			<div className="flex-1 p-6 overflow-auto">
				<div className="mx-auto w-full max-w-4xl space-y-6">
					{/* Header with filter */}
					<div className="flex items-center justify-between flex-wrap gap-4">
						<div>
							<h1 className="text-lg font-semibold text-foreground truncate max-w-xl">
								{submission.title}
							</h1>
							<p className="text-sm text-muted-foreground">
								{reviews.length} {reviews.length === 1 ? "review" : "reviews"}{" "}
								in {rounds.length} {rounds.length === 1 ? "round" : "rounds"}
							</p>
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

					{/* Reviews grouped by round */}
					{reviews.length === 0 ? (
						<div className="rounded-2xl bg-card shadow-2xl border p-8 text-center">
							<p className="text-muted-foreground">
								No reviews for this submission.
							</p>
						</div>
					) : (
						groupedByRound.map(({ round, reviews: roundReviews }) => (
							<ReviewsCard key={round} reviews={roundReviews} round={round} />
						))
					)}
				</div>
			</div>
		</div>
	);
}
