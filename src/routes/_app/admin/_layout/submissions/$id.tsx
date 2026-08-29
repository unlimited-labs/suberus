import {
	IconArrowLeft,
	IconFileText,
	IconHistory,
	IconMessages,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { editorSubmissionQueryOptions } from "@/features/submissions/api/admin-submissions";
import { CameraReadyCard } from "@/features/submissions/components/admin/camera-ready-card";
import {
	ActionsCard,
	ContentTab,
	DetailDialogs,
	DetailsCard,
	HistoryTab,
	ReviewersCard,
	ReviewsTab,
	type SubmissionDialogKind,
} from "@/features/submissions/components/admin/detail";
import { useAdminSubmissionDetail } from "@/features/submissions/hooks/use-admin-submission-detail";
import { useSubmissionTransitions } from "@/features/submissions/hooks/use-submission-transitions";
import { typeLabels } from "@/features/submissions/labels";
import { activeTracksQueryOptions } from "@/features/tracks/api/tracks";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";

export const Route = createFileRoute("/_app/admin/_layout/submissions/$id")({
	loader: async ({ params, context }) => {
		await context.queryClient.ensureQueryData(
			editorSubmissionQueryOptions(params.id),
		);
	},
	component: SubmissionDetailPage,
});

function SubmissionDetailPage() {
	const { id } = Route.useParams();
	const { data: availableTracks = [] } = useQuery(activeTracksQueryOptions());
	const detail = useAdminSubmissionDetail(id, availableTracks);
	const {
		isTransitioning,
		invalidateSubmission,
		handleTransitionToAwaitingDecision,
		handleEditorOverride,
		handleConfirmConditionsMet,
	} = useSubmissionTransitions(id);
	const [activeDialog, setActiveDialog] = useState<SubmissionDialogKind | null>(
		null,
	);

	if (detail.status === "not-found") {
		return (
			<div className="flex h-full flex-col">
				<PageHeader icon={IconFileText} title="Submission Not Found" />
				<div className="flex flex-1 items-center justify-center p-6">
					<div className="text-center">
						<p className="text-muted-foreground mb-4">Submission not found</p>
						<Link to="/admin/submissions">
							<Button className="gap-2" variant="outline">
								<IconArrowLeft className="size-4" />
								Back to Submissions
							</Button>
						</Link>
					</div>
				</div>
			</div>
		);
	}

	const {
		data,
		config,
		availability,
		primaryAction,
		currentRoundReviews,
		currentRoundAssignments,
		completedAssignments,
		reviewProgress,
		revisionUploaded,
	} = detail;
	const { submission, submitter, authors, reviews, activityHistory, versions } =
		data;

	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconFileText} title="Submission Details">
				<Link to="/admin/submissions">
					<Button className="gap-2" variant="outline">
						<IconArrowLeft className="size-4" />
						Back
					</Button>
				</Link>
			</PageHeader>

			<div className="flex-1 overflow-auto p-6">
				<div className="mx-auto max-w-6xl space-y-6">
					<div className="space-y-2">
						<Badge variant="outline">{typeLabels[submission.type]}</Badge>
						<h1 className="text-foreground text-xl leading-snug font-semibold">
							{submission.title}
						</h1>
					</div>

					<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
						<div className="space-y-4 lg:col-span-2">
							<Tabs className="space-y-4" defaultValue="content">
								<TabsList className="w-full justify-start" variant="line">
									<TabsTrigger className="flex-none gap-2" value="content">
										<IconFileText className="size-4" />
										Content
									</TabsTrigger>
									<TabsTrigger className="flex-none gap-2" value="reviews">
										<IconMessages className="size-4" />
										Reviews ({currentRoundReviews.length})
									</TabsTrigger>
									<TabsTrigger className="flex-none gap-2" value="history">
										<IconHistory className="size-4" />
										History
									</TabsTrigger>
								</TabsList>

								<TabsContent className="space-y-4" value="content">
									<ContentTab
										authors={authors}
										submission={submission}
										submissionId={submission.id}
										versions={versions}
									/>
								</TabsContent>

								<TabsContent className="space-y-4" value="reviews">
									<ReviewsTab
										currentRound={submission.currentRound}
										enableConfidenceLevel={config.enableConfidenceLevel}
										enableScoring={config.enableScoring}
										reviews={reviews}
									/>
								</TabsContent>

								<TabsContent value="history">
									<HistoryTab activityHistory={activityHistory} />
								</TabsContent>
							</Tabs>
						</div>

						<div className="space-y-4">
							<ActionsCard
								availability={availability}
								isTransitioning={isTransitioning}
								onOpenDialog={setActiveDialog}
								onTransition={handleTransitionToAwaitingDecision}
								primaryAction={primaryAction}
								submissionId={submission.id}
							/>
							<DetailsCard
								availableTracks={availableTracks}
								onTrackUpdated={invalidateSubmission}
								submission={submission}
								submitter={submitter}
							/>
							<ReviewersCard
								completedCount={completedAssignments.length}
								currentRoundAssignments={currentRoundAssignments}
								requiredReviewers={config.requiredReviewers}
								reviewProgress={reviewProgress}
							/>
							<CameraReadyCard submissionId={submission.id} />
						</div>
					</div>
				</div>
			</div>

			<DetailDialogs
				activeDialog={activeDialog}
				currentRoundReviews={currentRoundReviews}
				isTransitioning={isTransitioning}
				onClose={() => setActiveDialog(null)}
				onConfirmConditionsMet={handleConfirmConditionsMet}
				onEditorOverride={handleEditorOverride}
				onInvalidate={invalidateSubmission}
				requiredReviewers={config.requiredReviewers}
				reviewDeadlineDays={config.reviewDeadlineDays}
				revisionUploaded={revisionUploaded}
				submission={submission}
				submitter={submitter}
			/>
		</div>
	);
}
