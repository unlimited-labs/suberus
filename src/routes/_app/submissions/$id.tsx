import {
	IconArrowLeft,
	IconEdit,
	IconEye,
	IconFileText,
	IconFilter,
	IconMessageCircle,
} from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { submissionDetailQueryOptions } from "@/features/submissions/api/submissions";
import {
	ActionsCard,
	ContentTabs,
	InfoCard,
	MobileSidebar,
	StatusCard,
} from "@/features/submissions/components/detail";
import { EditorDecisionCard } from "@/features/submissions/components/editor-decision-card";
import { ReviewsCard } from "@/features/submissions/components/reviews-card";

export const Route = createFileRoute("/_app/submissions/$id")({
	loader: async ({ params, context }) => {
		await context.queryClient.ensureQueryData(
			submissionDetailQueryOptions(params.id),
		);
	},
	component: SubmissionDetailPage,
});

function SubmissionDetailPage() {
	const { id } = Route.useParams();
	const { data } = useSuspenseQuery(submissionDetailQueryOptions(id));

	const [selectedVersion, setSelectedVersion] = useState(
		data?.submission.currentVersion ?? 1,
	);
	const [selectedRound, setSelectedRound] = useState<string>("all");

	if (!data) {
		return <NotFoundState id={id} />;
	}

	const { submission, statusHistory, reviews, decision, versions } = data;
	const isReadOnly = submission.role === "coauthor";

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

	// Get version-specific data
	const versionData = versions.find((v) => v.version === selectedVersion);
	const displayData = {
		title: versionData?.title ?? submission.title,
		content: versionData?.content ?? submission.content,
		authors: versionData?.authors ?? submission.authors,
		keywords: versionData?.keywords ?? submission.keywords,
		file: versionData?.file ?? null,
	};

	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconFileText} title="Submission Details">
				<div className="flex items-center gap-2">
					{isReadOnly && (
						<Badge variant="secondary" className="gap-1">
							<IconEye className="size-3" />
							Co-author (read-only)
						</Badge>
					)}
					<Link to="/submissions">
						<Button variant="outline" className="gap-2">
							<IconArrowLeft className="size-4" />
							Back to List
						</Button>
					</Link>
				</div>
			</PageHeader>

			<div className="flex-1 p-6 overflow-auto">
				<div className="mx-auto w-full max-w-7xl">
					<div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
						{/* Main Content */}
						<div className="space-y-6">
							<ContentTabs
								title={displayData.title}
								content={displayData.content}
								keywords={displayData.keywords}
								authors={displayData.authors}
								statusHistory={statusHistory}
								file={displayData.file}
							/>

							{reviews.length > 0 && (
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
												<Select
													value={selectedRound}
													onValueChange={setSelectedRound}
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
											<div key={round} className="space-y-4">
												{versionComment && (
													<div className="rounded-2xl bg-card shadow-2xl border p-6">
														<div className="flex items-center gap-3 mb-3">
															<IconEdit className="size-5 text-muted-foreground" />
															<h3 className="text-sm font-semibold text-foreground">
																Author's revision notes – Version {round}
															</h3>
														</div>
														<div className="text-sm text-foreground leading-relaxed bg-muted/50 p-3 rounded-lg border">
															{versionComment.comment}
														</div>
													</div>
												)}
												<ReviewsCard reviews={roundReviews} round={round} />
											</div>
										);
									})}
								</div>
							)}

							{decision && (
								<EditorDecisionCard decision={decision} collapsible />
							)}
						</div>

						{/* Desktop Sidebar */}
						<div className="hidden lg:block">
							<div className="sticky top-0 space-y-4">
								<StatusCard status={submission.status} />
								<InfoCard
									submission={submission}
									versions={versions}
									selectedVersion={selectedVersion}
									onVersionChange={setSelectedVersion}
								/>
								{!isReadOnly && (
									<ActionsCard
										submissionId={submission.id}
										submissionTitle={submission.title}
										status={submission.status}
									/>
								)}
							</div>
						</div>

						{/* Mobile Sidebar */}
						<MobileSidebar
							submission={submission}
							versions={versions}
							selectedVersion={selectedVersion}
							onVersionChange={setSelectedVersion}
							isReadOnly={isReadOnly}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}

function NotFoundState({ id }: { id: string }) {
	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconFileText} title="Submission Not Found" />
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
