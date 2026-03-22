import {
	IconArrowLeft,
	IconCalendar,
	IconCheck,
	IconDownload,
	IconFile,
	IconFileText,
	IconGavel,
	IconHistory,
	IconLoader2,
	IconTrash,
	IconUsers,
	IconX,
} from "@tabler/icons-react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { AssignReviewerDialog } from "@/components/admin/submissions/assign-reviewer-dialog";
import { ConfirmConditionsDialog } from "@/components/admin/submissions/confirm-conditions-dialog";
import { DeskRejectDialog } from "@/components/admin/submissions/desk-reject-dialog";
import { EditorDecisionDialog } from "@/components/admin/submissions/editor-decision-dialog";
import { OverrideDecisionDialog } from "@/components/admin/submissions/override-decision-dialog";
import { SubmissionDeleteDialog } from "@/components/admin/submissions/submission-delete-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Timeline, TimelineItem } from "@/components/ui/timeline";
import { useDateFormat } from "@/hooks/use-date-format";
import { useSubmissionTransitions } from "@/hooks/use-submission-transitions";
import {
	assignmentStatusColors,
	assignmentStatusLabels,
} from "@/lib/labels/assignment";
import {
	reviewDecisionColors,
	statusLabels,
	statusVariants,
	typeLabels,
} from "@/lib/labels/submission";
import { SUBMISSION_TYPE_TO_KEY } from "@/lib/settings/types";
import { formatFileSize } from "@/lib/utils";
import {
	editorSubmissionQueryOptions,
	updateSubmissionTrackFn,
} from "@/utils/admin-submissions.functions";
import { adminSettingQueryOptions } from "@/utils/settings.functions";
import { activeTracksQueryOptions } from "@/utils/tracks.functions";

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
	const { formatDateTime } = useDateFormat();

	const { data } = useSuspenseQuery(editorSubmissionQueryOptions(id));

	const [showAssignDialog, setShowAssignDialog] = useState(false);
	const [showDecisionDialog, setShowDecisionDialog] = useState(false);
	const [showDeskRejectDialog, setShowDeskRejectDialog] = useState(false);
	const [showOverrideDialog, setShowOverrideDialog] = useState(false);
	const [showConfirmConditionsDialog, setShowConfirmConditionsDialog] =
		useState(false);
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [selectedReviewRound, setSelectedReviewRound] =
		useState<string>("current");

	const {
		isTransitioning,
		invalidateSubmission,
		handleTransitionToReviewsComplete,
		handleTransitionToAwaitingDecision,
		handleEditorOverride,
		handleConfirmConditionsMet,
	} = useSubmissionTransitions(id);

	// Load config for this submission type
	const configKey = data
		? SUBMISSION_TYPE_TO_KEY[data.submission.type]
		: undefined;
	const { data: config } = useQuery({
		...adminSettingQueryOptions(
			configKey ?? "SUBMISSION_TYPE_ORAL_PRESENTATION",
		),
		enabled: !!configKey,
	});

	// Load active tracks if submission is ABSTRACT
	const { data: availableTracks = [] } = useQuery({
		...activeTracksQueryOptions(),
		enabled: data?.submission.type === "ABSTRACT",
	});

	if (!data || !config) {
		return (
			<div className="flex h-full flex-col">
				<PageHeader icon={IconFileText} title="Submission Not Found" />
				<div className="flex-1 p-6 flex items-center justify-center">
					<div className="text-center">
						<p className="text-muted-foreground mb-4">Submission not found</p>
						<Link to="/admin/submissions">
							<Button variant="outline" className="gap-2">
								<IconArrowLeft className="size-4" />
								Back to Submissions
							</Button>
						</Link>
					</div>
				</div>
			</div>
		);
	}

	const { submission, authors, assignments, reviews, statusHistory } = data;

	// Calculate review progress
	const currentRoundAssignments = assignments.filter(
		(a) => a.round === submission.currentRound && a.status !== "CANCELLED",
	);
	const completedAssignments = currentRoundAssignments.filter(
		(a) => a.status === "COMPLETED",
	);
	const currentRoundReviews = reviews.filter(
		(r) => r.round === submission.currentRound,
	);

	// Reviews with round filtering for reviews tab
	const allReviewRounds = [...new Set(reviews.map((r) => r.round))].sort(
		(a, b) => b - a,
	);
	const displayedReviews =
		selectedReviewRound === "all"
			? reviews
			: selectedReviewRound === "current"
				? currentRoundReviews
				: reviews.filter((r) => r.round === Number(selectedReviewRound));

	// Determine available actions based on status
	const canAssignReviewers = [
		"SUBMITTED",
		"UNDER_REVIEW",
		"RESUBMITTED",
	].includes(submission.status);

	const canDeskReject = submission.status === "SUBMITTED";

	const allReviewsComplete =
		completedAssignments.length >= currentRoundAssignments.length &&
		currentRoundAssignments.length >= config.requiredReviewers;

	const canTransitionToReviewsComplete =
		submission.status === "UNDER_REVIEW" &&
		allReviewsComplete &&
		!config.autoTransitionAfterReviews;

	const canTransitionToAwaitingDecision =
		submission.status === "REVIEWS_COMPLETE" && config.requiresEditorDecision;

	const canMakeDecision =
		submission.status === "AWAITING_DECISION" ||
		submission.status === "REVIEWS_COMPLETE";

	const canConfirmConditions = submission.status === "CONDITIONALLY_ACCEPTED";

	const canOverrideDecision = [
		"ACCEPTED",
		"CONDITIONALLY_ACCEPTED",
		"REJECTED",
	].includes(submission.status);

	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconFileText} title="Submission Details">
				<Link to="/admin/submissions">
					<Button variant="outline" className="gap-2">
						<IconArrowLeft className="size-4" />
						Back
					</Button>
				</Link>
			</PageHeader>

			<div className="flex-1 overflow-auto p-6">
				<div className="max-w-6xl mx-auto space-y-6">
					{/* Header Card */}
					<Card>
						<CardHeader>
							<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
								<div className="space-y-2">
									<div className="flex items-center gap-2 flex-wrap">
										<Badge variant="outline">
											{typeLabels[submission.type]}
										</Badge>
										<Badge
											data-testid="submission-status"
											variant={statusVariants[submission.status] ?? "secondary"}
										>
											{statusLabels[submission.status] ?? submission.status}
										</Badge>
										<Badge variant="outline">
											Round {submission.currentRound}
										</Badge>
									</div>
									<CardTitle className="text-xl">{submission.title}</CardTitle>
								</div>

								{/* Action Buttons */}
								<div className="flex flex-wrap gap-2">
									{canAssignReviewers && (
										<Button
											variant="outline"
											onClick={() => setShowAssignDialog(true)}
										>
											<IconUsers className="size-4 mr-2" />
											Assign Reviewer
										</Button>
									)}
									{canDeskReject && (
										<Button
											variant="outline"
											className="text-red-600"
											onClick={() => setShowDeskRejectDialog(true)}
										>
											<IconX className="size-4 mr-2" />
											Desk Reject
										</Button>
									)}
									{canTransitionToReviewsComplete && (
										<Button
											onClick={handleTransitionToReviewsComplete}
											disabled={isTransitioning}
										>
											{isTransitioning ? (
												<IconLoader2 className="size-4 mr-2 animate-spin" />
											) : (
												<IconCalendar className="size-4 mr-2" />
											)}
											Mark Reviews Complete
										</Button>
									)}
									{canTransitionToAwaitingDecision && (
										<Button
											onClick={handleTransitionToAwaitingDecision}
											disabled={isTransitioning}
										>
											{isTransitioning ? (
												<IconLoader2 className="size-4 mr-2 animate-spin" />
											) : (
												<IconGavel className="size-4 mr-2" />
											)}
											Ready for Decision
										</Button>
									)}
									{canMakeDecision && (
										<Button onClick={() => setShowDecisionDialog(true)}>
											<IconGavel className="size-4 mr-2" />
											Make Decision
										</Button>
									)}
									{canConfirmConditions && (
										<Button
											onClick={() => setShowConfirmConditionsDialog(true)}
										>
											<IconCheck className="size-4 mr-2" />
											Confirm Conditions Met
										</Button>
									)}
									{canOverrideDecision && (
										<Button
											variant="outline"
											onClick={() => setShowOverrideDialog(true)}
										>
											<IconGavel className="size-4 mr-2" />
											Override Decision
										</Button>
									)}
									<Button
										variant="destructive"
										onClick={() => setShowDeleteDialog(true)}
									>
										<IconTrash className="size-4 mr-2" />
										Delete
									</Button>
								</div>
							</div>
						</CardHeader>
					</Card>

					<Tabs defaultValue="content" className="space-y-4">
						<TabsList>
							<TabsTrigger value="content">Content</TabsTrigger>
							<TabsTrigger value="reviews">
								Reviews ({currentRoundReviews.length})
							</TabsTrigger>
							<TabsTrigger value="history">History</TabsTrigger>
						</TabsList>

						<TabsContent value="content" className="space-y-4">
							{/* Authors */}
							<Card>
								<CardHeader>
									<CardTitle className="text-base">Authors</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="flex flex-wrap gap-2">
										{authors.map((author, index) => (
											<div
												key={index}
												className={`px-3 py-2 rounded-lg border text-sm ${
													author.isPresenter
														? "border-primary/30 bg-primary/5"
														: "border-border"
												}`}
											>
												<div className="font-medium">
													{author.firstName} {author.lastName}
													{author.isPresenter && (
														<Badge variant="secondary" className="ml-2 text-xs">
															Presenter
														</Badge>
													)}
												</div>
												<div className="text-xs text-muted-foreground">
													{author.email}
													{author.affiliationName &&
														` • ${author.affiliationName}`}
												</div>
											</div>
										))}
									</div>
								</CardContent>
							</Card>

							{/* Track Assignment (ABSTRACT only) */}
							{submission.type === "ABSTRACT" && (
								<Card>
									<CardHeader>
										<CardTitle className="text-base">
											Track Assignment
										</CardTitle>
									</CardHeader>
									<CardContent>
										<Select
											value={submission.trackId || "none"}
											onValueChange={async (value) => {
												try {
													await updateSubmissionTrackFn({
														data: {
															submissionId: submission.id,
															trackId: value === "none" ? null : value,
														},
													});
													toast.success("Track updated");
													await invalidateSubmission();
												} catch {
													toast.error("Failed to update track");
												}
											}}
										>
											<SelectTrigger>
												<SelectValue placeholder="No track" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="none">None</SelectItem>
												{availableTracks.map((s) => (
													<SelectItem key={s.id} value={s.id}>
														{s.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</CardContent>
								</Card>
							)}

							{/* Abstract/Content */}
							<Card>
								<CardHeader>
									<CardTitle className="text-base">Content</CardTitle>
								</CardHeader>
								<CardContent>
									{submission.file ? (
										<div className="flex items-center gap-4 p-4 rounded-lg border bg-muted/30">
											<div className="flex-shrink-0 p-2 rounded-md bg-primary/10">
												<IconFile className="size-6 text-primary" />
											</div>
											<div className="flex-1 min-w-0">
												<p className="text-sm font-medium text-foreground truncate">
													{submission.file.originalName}
												</p>
												<p className="text-xs text-muted-foreground">
													{formatFileSize(submission.file.size)} &middot;{" "}
													{submission.file.mimeType}
												</p>
											</div>
											<a
												href={`/api/files/${submission.file.id}`}
												data-testid="file-download-button"
												className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground"
											>
												<IconDownload className="size-4" />
												Download
											</a>
										</div>
									) : (
										<div className="prose prose-sm max-w-none">
											<p className="whitespace-pre-wrap">
												{submission.content}
											</p>
										</div>
									)}
								</CardContent>
							</Card>

							{/* Reviewers */}
							<Card>
								<CardHeader>
									<CardTitle className="text-base flex items-center justify-between">
										<span>
											Reviewers ({completedAssignments.length}/
											{currentRoundAssignments.length})
										</span>
										<span className="text-sm font-normal text-muted-foreground">
											Required: {config.requiredReviewers}
										</span>
									</CardTitle>
								</CardHeader>
								<CardContent>
									{currentRoundAssignments.length === 0 ? (
										<p className="text-sm text-muted-foreground">
											No reviewers assigned yet
										</p>
									) : (
										<div className="space-y-2">
											{currentRoundAssignments.map((assignment) => (
												<div
													key={assignment.id}
													className="flex items-center justify-between p-3 rounded-lg border"
												>
													<div>
														<div className="font-medium text-sm">
															{assignment.reviewerName}
														</div>
														<div className="text-xs text-muted-foreground">
															{assignment.reviewerEmail}
														</div>
													</div>
													<Badge
														variant="outline"
														className={
															assignmentStatusColors[assignment.status]
														}
													>
														{assignmentStatusLabels[
															assignment.status as keyof typeof assignmentStatusLabels
														] ?? assignment.status}
													</Badge>
												</div>
											))}
										</div>
									)}
								</CardContent>
							</Card>
						</TabsContent>

						<TabsContent value="reviews" className="space-y-4">
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
												Current round ({submission.currentRound})
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
									<CardContent className="py-8 text-center text-muted-foreground">
										No reviews submitted yet
									</CardContent>
								</Card>
							) : (
								displayedReviews.map((review) => (
									<Card key={review.id}>
										<CardHeader>
											<div className="flex items-center justify-between">
												<div>
													<CardTitle className="text-base">
														{review.reviewerName}
													</CardTitle>
													{allReviewRounds.length > 1 && (
														<p className="text-xs text-muted-foreground">
															Round {review.round}
														</p>
													)}
												</div>
												<Badge
													variant="outline"
													className={reviewDecisionColors[review.decision]}
												>
													{review.decision.replace(/_/g, " ")}
												</Badge>
											</div>
										</CardHeader>
										<CardContent className="space-y-4">
											{review.scores &&
												Object.keys(review.scores).length > 0 && (
													<div>
														<p className="text-sm font-medium mb-2">Scores</p>
														<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
															{Object.entries(review.scores).map(
																([name, score]) => (
																	<div
																		key={name}
																		className="flex justify-between text-sm bg-muted/50 rounded px-2 py-1"
																	>
																		<span className="text-muted-foreground truncate mr-2">
																			{name}
																		</span>
																		<span className="font-medium">
																			{score}/5
																		</span>
																	</div>
																),
															)}
														</div>
													</div>
												)}

											{review.confidenceLevel != null && (
												<p className="text-sm">
													<span className="text-muted-foreground">
														Confidence:
													</span>{" "}
													<span className="font-medium">
														{review.confidenceLevel}/5
													</span>
												</p>
											)}

											<div>
												<p className="text-sm font-medium mb-1">Comments</p>
												{review.comments ? (
													<p className="text-sm whitespace-pre-wrap">
														{review.comments}
													</p>
												) : (
													<p className="text-sm text-muted-foreground italic">
														No comments provided
													</p>
												)}
											</div>

											{review.privateNotes && (
												<div className="border-t pt-3">
													<p className="text-sm font-medium mb-1 text-amber-600 dark:text-amber-400">
														Private Notes (editor only)
													</p>
													<p className="text-sm whitespace-pre-wrap bg-amber-50 dark:bg-amber-950/20 rounded p-2">
														{review.privateNotes}
													</p>
												</div>
											)}
										</CardContent>
									</Card>
								))
							)}
						</TabsContent>

						<TabsContent value="history">
							<Card>
								<CardHeader>
									<CardTitle className="text-base flex items-center gap-2">
										<IconHistory className="size-4" />
										Status History
									</CardTitle>
								</CardHeader>
								<CardContent>
									<Timeline>
										{statusHistory.map((entry, index) => (
											<TimelineItem key={index}>
												<div className="flex flex-col gap-1">
													<div className="flex items-center gap-2">
														<Badge
															variant={
																statusVariants[
																	entry.toStatus as keyof typeof statusVariants
																] ?? "secondary"
															}
														>
															{statusLabels[
																entry.toStatus as keyof typeof statusLabels
															] ?? entry.toStatus}
														</Badge>
														{entry.fromStatus && (
															<span className="text-xs text-muted-foreground">
																from{" "}
																{statusLabels[
																	entry.fromStatus as keyof typeof statusLabels
																] ?? entry.fromStatus}
															</span>
														)}
													</div>
													{entry.reason && (
														<p className="text-sm text-muted-foreground">
															{entry.reason}
														</p>
													)}
													<div className="text-xs text-muted-foreground">
														{formatDateTime(new Date(entry.createdAt))}
														{entry.triggeredByName &&
															` by ${entry.triggeredByName}`}
													</div>
												</div>
											</TimelineItem>
										))}
									</Timeline>
								</CardContent>
							</Card>
						</TabsContent>
					</Tabs>
				</div>
			</div>

			{/* Dialogs */}
			<AssignReviewerDialog
				submissionId={submission.id}
				submissionTitle={submission.title}
				requiredReviewers={config.requiredReviewers}
				open={showAssignDialog}
				onOpenChange={setShowAssignDialog}
				onAssigned={invalidateSubmission}
			/>

			<EditorDecisionDialog
				submissionId={submission.id}
				submissionTitle={submission.title}
				reviews={currentRoundReviews}
				open={showDecisionDialog}
				onOpenChange={setShowDecisionDialog}
				onDecisionMade={invalidateSubmission}
			/>

			<DeskRejectDialog
				submissionId={submission.id}
				submissionTitle={submission.title}
				open={showDeskRejectDialog}
				onOpenChange={setShowDeskRejectDialog}
				onRejected={invalidateSubmission}
			/>

			<OverrideDecisionDialog
				open={showOverrideDialog}
				onOpenChange={setShowOverrideDialog}
				onOverride={handleEditorOverride}
				isTransitioning={isTransitioning}
			/>

			<ConfirmConditionsDialog
				open={showConfirmConditionsDialog}
				onOpenChange={setShowConfirmConditionsDialog}
				onConfirm={handleConfirmConditionsMet}
				isTransitioning={isTransitioning}
			/>

			<SubmissionDeleteDialog
				submissionId={submission.id}
				submissionTitle={submission.title}
				open={showDeleteDialog}
				onOpenChange={setShowDeleteDialog}
			/>
		</div>
	);
}
