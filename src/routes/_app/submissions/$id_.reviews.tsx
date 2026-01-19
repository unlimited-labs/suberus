import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	IconArrowLeft,
	IconMessageCircle,
	IconFilter,
} from "@tabler/icons-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { ReviewsCard } from "@/components/submissions/reviews-card";
import {
	getSubmissionById,
	getReviewsForSubmission,
} from "@/lib/mock-data/submissions";

export const Route = createFileRoute("/_app/submissions/$id_/reviews")({
	component: SubmissionReviewsPage,
});

function SubmissionReviewsPage() {
	const { id } = Route.useParams();
	const submission = getSubmissionById(id);
	const reviews = getReviewsForSubmission(id);

	const rounds = [...new Set(reviews.map((r) => r.round))].sort(
		(a, b) => b - a,
	)
	const [selectedRound, setSelectedRound] = useState<string>("all");

	if (!submission) {
		return (
			<div className="flex h-full flex-col">
				<PageHeader icon={IconMessageCircle} title="Recenzje" />
				<div className="flex-1 p-6 flex items-center justify-center">
					<div className="text-center">
						<p className="text-muted-foreground mb-4">
							Nie znaleziono zgłoszenia o ID: {id}
						</p>
						<Link to="/submissions">
							<Button variant="outline" className="gap-2">
								<IconArrowLeft className="size-4" />
								Powrót do listy
							</Button>
						</Link>
					</div>
				</div>
			</div>
		)
	}

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
		}))

	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconMessageCircle} title="Recenzje">
				<Link to="/submissions/$id" params={{ id }}>
					<Button variant="outline" className="gap-2">
						<IconArrowLeft className="size-4" />
						Powrót do zgłoszenia
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
								{reviews.length}{" "}
								{reviews.length === 1
									? "recenzja"
									: reviews.length < 5
										? "recenzje"
										: "recenzji"}{" "}
								w {rounds.length}{" "}
								{rounds.length === 1 ? "rundzie" : "rundach"}
							</p>
						</div>
						{rounds.length > 1 && (
							<div className="flex items-center gap-2">
								<IconFilter className="size-4 text-muted-foreground" />
								<Select
									value={selectedRound}
									onValueChange={setSelectedRound}
								>
									<SelectTrigger className="w-[140px]">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">Wszystkie rundy</SelectItem>
										{rounds.map((round) => (
											<SelectItem key={round} value={round.toString()}>
												Runda {round}
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
								Brak recenzji dla tego zgłoszenia.
							</p>
						</div>
					) : (
						groupedByRound.map(({ round, reviews: roundReviews }) => (
							<ReviewsCard
								key={round}
								reviews={roundReviews}
								round={round}
							/>
						))
					)}
				</div>
			</div>
		</div>
	)
}
