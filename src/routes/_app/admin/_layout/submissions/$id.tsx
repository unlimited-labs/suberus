import {
	IconArrowLeft,
	IconCalendar,
	IconCheck,
	IconChevronDown,
	IconCircleDot,
	IconClock,
	IconDownload,
	IconFile,
	IconFileText,
	IconGavel,
	IconHistory,
	IconLoader2,
	IconMessages,
	IconRepeat,
	IconRoute,
	IconStarFilled,
	IconTrash,
	IconUserCircle,
	IconUsers,
	IconX,
} from "@tabler/icons-react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { isPast } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";

import { ActivityHistoryEvent } from "@/components/admin/submissions/activity-history-event";
import { AssignReviewerDialog } from "@/components/admin/submissions/assign-reviewer-dialog";
import { ConfirmConditionsDialog } from "@/components/admin/submissions/confirm-conditions-dialog";
import { DeskAcceptDialog } from "@/components/admin/submissions/desk-accept-dialog";
import { DeskRejectDialog } from "@/components/admin/submissions/desk-reject-dialog";
import { EditorDecisionDialog } from "@/components/admin/submissions/editor-decision-dialog";
import { OverrideDecisionDialog } from "@/components/admin/submissions/override-decision-dialog";
import { SubmissionDeleteDialog } from "@/components/admin/submissions/submission-delete-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { VersionSelector } from "@/components/submissions/version-selector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Timeline } from "@/components/ui/timeline";
import { useDateFormat } from "@/hooks/use-date-format";
import { useSubmissionTransitions } from "@/hooks/use-submission-transitions";
import {
	assignmentStatusLabels,
	assignmentStatusVariants,
} from "@/lib/labels/assignment";
import {
	reviewDecisionColors,
	statusLabels,
	statusVariants,
	typeLabels,
} from "@/lib/labels/submission";
import { SUBMISSION_TYPE_TO_KEY } from "@/lib/settings/types";
import { cn, formatFileSize } from "@/lib/utils";
import {
	editorSubmissionQueryOptions,
	updateSubmissionTrackFn,
} from "@/server-fns/admin/submissions";
import { adminSettingQueryOptions } from "@/server-fns/settings";
import { activeTracksQueryOptions } from "@/server-fns/tracks";

export const Route = createFileRoute("/_app/admin/_layout/submissions/$id")({
	loader: async ({ params, context }) => {
		await context.queryClient.ensureQueryData(
			editorSubmissionQueryOptions(params.id),
		);
	},
	component: SubmissionDetailPage,
});

function isOverdue(deadline: Date | string | null, status: string): boolean {
	if (!deadline || status === "COMPLETED" || status === "CANCELLED") {
		return false;
	}
	return isPast(new Date(deadline));
}

function SubmissionDetailPage() {
	const { id } = Route.useParams();

	const { data } = useSuspenseQuery(editorSubmissionQueryOptions(id));
	const { formatDate } = useDateFormat();

	const [showAssignDialog, setShowAssignDialog] = useState(false);
	const [showDecisionDialog, setShowDecisionDialog] = useState(false);
	const [showDeskAcceptDialog, setShowDeskAcceptDialog] = useState(false);
	const [showDeskRejectDialog, setShowDeskRejectDialog] = useState(false);
	const [showOverrideDialog, setShowOverrideDialog] = useState(false);
	const [showConfirmConditionsDialog, setShowConfirmConditionsDialog] =
		useState(false);
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [selectedReviewRound, setSelectedReviewRound] =
		useState<string>("current");
	const [selectedVersion, setSelectedVersion] = useState<number | null>(null);

	const {
		isTransitioning,
		invalidateSubmission,
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
				<div className="flex flex-1 items-center justify-center p-6">
					<div className="text-center">
						<p className="mb-4 text-muted-foreground">Submission not found</p>
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

	const {
		submission,
		submitter,
		authors,
		assignments,
		reviews,
		activityHistory,
		versions,
	} = data;

	// Version viewing: default to current version unless an older one is selected
	const effectiveVersion = selectedVersion ?? submission.currentVersionNumber;
	const displayedVersion = versions.find((v) => v.version === effectiveVersion);
	const displayedContent = displayedVersion?.content ?? submission.content;
	const displayedFile = displayedVersion?.file ?? submission.file;

	// Whether the author uploaded a revised version after a conditional acceptance
	const revisionUploaded = activityHistory.some(
		(e) => e.activityType === "SUBMISSION_REVISION_UPLOADED",
	);

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
	const reviewProgress =
		currentRoundAssignments.length > 0
			? (completedAssignments.length / currentRoundAssignments.length) * 100
			: 0;

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
	// (EXHIBITOR submissions are never peer-reviewed — no reviewer assignment)
	const canAssignReviewers =
		submission.type !== "EXHIBITOR" &&
		["SUBMITTED", "UNDER_REVIEW", "RESUBMITTED"].includes(submission.status);

	const canDeskAccept = submission.status === "SUBMITTED";
	const canDeskReject = submission.status === "SUBMITTED";

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

	// One contextual primary action; everything else goes to the Actions menu.
	const primaryAction = canTransitionToAwaitingDecision
		? "transition"
		: canMakeDecision
			? "decision"
			: canConfirmConditions
				? "conditions"
				: null;

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
				<div className="mx-auto max-w-6xl space-y-6">
					{/* Title */}
					<div className="space-y-2">
						<Badge variant="outline">{typeLabels[submission.type]}</Badge>
						<h1 className="text-xl font-semibold leading-snug text-foreground">
							{submission.title}
						</h1>
					</div>

					{/* Two-column: main content + sidebar */}
					<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
						{/* Main */}
						<div className="space-y-4 lg:col-span-2">
							<Tabs defaultValue="content" className="space-y-4">
								<TabsList variant="line" className="w-full justify-start">
									<TabsTrigger value="content" className="flex-none gap-2">
										<IconFileText className="size-4" />
										Content
									</TabsTrigger>
									<TabsTrigger value="reviews" className="flex-none gap-2">
										<IconMessages className="size-4" />
										Reviews ({currentRoundReviews.length})
									</TabsTrigger>
									<TabsTrigger value="history" className="flex-none gap-2">
										<IconHistory className="size-4" />
										History
									</TabsTrigger>
								</TabsList>

								<TabsContent value="content" className="space-y-4">
									{/* Authors — equal-width grid cards */}
									<Card>
										<CardHeader>
											<CardTitle className="text-base">Authors</CardTitle>
										</CardHeader>
										<CardContent>
											<div
												className={cn(
													"grid grid-cols-1 gap-2",
													authors.length > 1 && "sm:grid-cols-2",
												)}
											>
												{authors.map((author, index) => (
													<div
														key={`${author.email}-${index}`}
														data-testid={`submission-author-${index}`}
														className={cn(
															"flex items-start gap-3 rounded-lg border p-3 transition-colors",
															author.isPresenter
																? "border-primary/30 bg-primary/5"
																: "border-border/50 bg-muted/30",
														)}
													>
														<div
															className={cn(
																"flex size-8 shrink-0 items-center justify-center rounded-md text-sm font-semibold",
																author.isPresenter
																	? "bg-primary/10 text-primary"
																	: "bg-muted text-muted-foreground",
															)}
														>
															{index + 1}
														</div>
														<div className="min-w-0 flex-1">
															<div className="flex flex-wrap items-center gap-2">
																{author.userId ? (
																	<Link
																		to="/admin/users/$id"
																		params={{ id: author.userId }}
																		data-testid={`author-profile-link-${index}`}
																		className="flex items-center gap-1 font-medium text-foreground hover:text-primary hover:underline"
																	>
																		{author.firstName} {author.lastName}
																		<IconUserCircle className="size-4 text-muted-foreground" />
																	</Link>
																) : (
																	<span className="font-medium text-foreground">
																		{author.firstName} {author.lastName}
																	</span>
																)}
																{author.isPresenter && (
																	<Badge
																		variant="secondary"
																		className="gap-1 border-primary/20 bg-primary/10 text-xs text-primary"
																	>
																		<IconStarFilled className="size-3" />
																		Presenter
																	</Badge>
																)}
															</div>
															<p className="mt-0.5 truncate text-sm text-muted-foreground">
																{author.affiliationName ?? (
																	<span className="italic opacity-70">
																		No affiliation
																	</span>
																)}
															</p>
															<p className="truncate text-xs text-muted-foreground/70">
																{author.email}
															</p>
														</div>
													</div>
												))}
											</div>
										</CardContent>
									</Card>

									{/* Abstract / Content */}
									<Card>
										<CardHeader className="flex flex-row items-start justify-between gap-4">
											<CardTitle className="text-base">Content</CardTitle>
											{versions.length > 1 && (
												<div className="w-44">
													<VersionSelector
														versions={versions}
														currentVersion={submission.currentVersionNumber}
														selectedVersion={effectiveVersion}
														onVersionChange={setSelectedVersion}
													/>
												</div>
											)}
										</CardHeader>
										<CardContent>
											{displayedFile ? (
												<div className="flex items-center gap-4 rounded-lg border bg-muted/30 p-4">
													<div className="shrink-0 rounded-md bg-primary/10 p-2">
														<IconFile className="size-6 text-primary" />
													</div>
													<div className="min-w-0 flex-1">
														<p className="truncate text-sm font-medium text-foreground">
															{displayedFile.originalName}
														</p>
														<p className="text-xs text-muted-foreground">
															{formatFileSize(displayedFile.size)}
														</p>
													</div>
													<a
														href={`/api/files/${displayedFile.id}`}
														data-testid="file-download-button"
														className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
													>
														<IconDownload className="size-4" />
														Download
													</a>
												</div>
											) : (
												<div className="prose prose-sm max-w-none dark:prose-invert">
													{displayedContent.split(/\n{2,}/).map((para, i) => (
														<p
															key={i}
															className="whitespace-pre-wrap break-words"
														>
															{para}
														</p>
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
											<CardContent className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
												<IconGavel className="size-8 opacity-40" />
												<p className="text-sm">No reviews submitted yet</p>
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
													{config.enableScoring &&
														review.scores &&
														Object.keys(review.scores).length > 0 && (
															<div>
																<p className="mb-2 text-sm font-medium">
																	Scores
																</p>
																<div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
																	{Object.entries(review.scores).map(
																		([name, score]) => (
																			<div
																				key={name}
																				className="flex justify-between rounded bg-muted/50 px-2 py-1 text-sm"
																			>
																				<span className="mr-2 truncate text-muted-foreground">
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

													{config.enableConfidenceLevel &&
														review.confidenceLevel != null && (
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
														<p className="mb-1 text-sm font-medium">Comments</p>
														{review.comments ? (
															<p className="whitespace-pre-wrap break-words text-sm">
																{review.comments}
															</p>
														) : (
															<p className="text-sm italic text-muted-foreground">
																No comments provided
															</p>
														)}
													</div>

													{review.attachment && (
														<div className="border-t pt-3">
															<p className="mb-1 text-sm font-medium">
																Attachment
															</p>
															<a
																href={`/api/files/${review.attachment.id}`}
																className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
															>
																<IconDownload className="size-4" />
																{review.attachment.originalName}
																<span className="text-xs text-muted-foreground">
																	({formatFileSize(review.attachment.size)})
																</span>
															</a>
														</div>
													)}

													{review.privateNotes && (
														<div className="border-t pt-3">
															<p className="mb-1 text-sm font-medium text-amber-600 dark:text-amber-400">
																Private Notes (editor only)
															</p>
															<p className="whitespace-pre-wrap break-words rounded bg-amber-50 p-2 text-sm dark:bg-amber-950/20">
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
											<CardTitle className="flex items-center gap-2 text-base">
												<IconHistory className="size-4" />
												Activity History
											</CardTitle>
										</CardHeader>
										<CardContent>
											<Timeline>
												{activityHistory.map((entry, index) => (
													<ActivityHistoryEvent
														key={`${entry.activityType}-${index}`}
														entry={entry}
														isLast={index === activityHistory.length - 1}
													/>
												))}
											</Timeline>
										</CardContent>
									</Card>
								</TabsContent>
							</Tabs>
						</div>

						{/* Sidebar */}
						<div className="space-y-4">
							{/* Actions */}
							<Card>
								<CardHeader>
									<CardTitle className="text-base">Actions</CardTitle>
								</CardHeader>
								<CardContent className="space-y-2">
									{primaryAction === "transition" && (
										<Button
											className="w-full"
											onClick={handleTransitionToAwaitingDecision}
											disabled={isTransitioning}
										>
											{isTransitioning ? (
												<IconLoader2 className="mr-2 size-4 animate-spin" />
											) : (
												<IconGavel className="mr-2 size-4" />
											)}
											Ready for Decision
										</Button>
									)}
									{primaryAction === "decision" && (
										<Button
											className="w-full"
											onClick={() => setShowDecisionDialog(true)}
										>
											<IconGavel className="mr-2 size-4" />
											Make Decision
										</Button>
									)}
									{primaryAction === "conditions" && (
										<Button
											className="w-full"
											onClick={() => setShowConfirmConditionsDialog(true)}
										>
											<IconCheck className="mr-2 size-4" />
											Confirm Conditions Met
										</Button>
									)}

									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button
												variant="outline"
												className="w-full justify-between"
												data-testid="submission-actions-trigger"
											>
												{primaryAction ? "More actions" : "Actions"}
												<IconChevronDown className="size-4" />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="start">
											{canAssignReviewers && (
												<DropdownMenuItem
													onSelect={() => setShowAssignDialog(true)}
												>
													<IconUsers className="mr-2 size-4" />
													Assign Reviewer
												</DropdownMenuItem>
											)}
											{canDeskAccept && (
												<DropdownMenuItem
													onSelect={() => setShowDeskAcceptDialog(true)}
												>
													<IconCheck className="mr-2 size-4" />
													Desk Accept
												</DropdownMenuItem>
											)}
											{canDeskReject && (
												<DropdownMenuItem
													onSelect={() => setShowDeskRejectDialog(true)}
												>
													<IconX className="mr-2 size-4" />
													Desk Reject
												</DropdownMenuItem>
											)}
											{canTransitionToAwaitingDecision &&
												primaryAction !== "transition" && (
													<DropdownMenuItem
														onSelect={handleTransitionToAwaitingDecision}
														disabled={isTransitioning}
													>
														<IconGavel className="mr-2 size-4" />
														Ready for Decision
													</DropdownMenuItem>
												)}
											{canMakeDecision && primaryAction !== "decision" && (
												<DropdownMenuItem
													onSelect={() => setShowDecisionDialog(true)}
												>
													<IconGavel className="mr-2 size-4" />
													Make Decision
												</DropdownMenuItem>
											)}
											{canConfirmConditions &&
												primaryAction !== "conditions" && (
													<DropdownMenuItem
														onSelect={() =>
															setShowConfirmConditionsDialog(true)
														}
													>
														<IconCheck className="mr-2 size-4" />
														Confirm Conditions Met
													</DropdownMenuItem>
												)}
											{canOverrideDecision && (
												<DropdownMenuItem
													onSelect={() => setShowOverrideDialog(true)}
												>
													<IconGavel className="mr-2 size-4" />
													Override Decision
												</DropdownMenuItem>
											)}
											<DropdownMenuSeparator />
											<DropdownMenuItem
												variant="destructive"
												onSelect={() => setShowDeleteDialog(true)}
											>
												<IconTrash className="mr-2 size-4" />
												Delete
											</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								</CardContent>
							</Card>

							{/* Details */}
							<Card>
								<CardHeader>
									<CardTitle className="text-base">Details</CardTitle>
								</CardHeader>
								<CardContent className="space-y-3 text-sm">
									<div className="flex items-center justify-between gap-2">
										<span className="flex items-center gap-1.5 text-muted-foreground">
											<IconCircleDot className="size-4" />
											Status
										</span>
										<Badge
											data-testid="submission-status"
											variant={statusVariants[submission.status] ?? "secondary"}
											className="-mr-2"
										>
											{statusLabels[submission.status] ?? submission.status}
										</Badge>
									</div>
									<div className="flex items-center justify-between gap-2">
										<span className="flex items-center gap-1.5 text-muted-foreground">
											<IconRepeat className="size-4" />
											Round
										</span>
										<span className="font-medium">
											{submission.currentRound}
										</span>
									</div>
									<div className="flex items-center justify-between gap-2">
										<span className="flex items-center gap-1.5 text-muted-foreground">
											<IconCalendar className="size-4" />
											Submitted
										</span>
										<span className="font-medium">
											{formatDate(submission.createdAt)}
										</span>
									</div>
									<div className="flex items-center justify-between gap-2">
										<span className="flex items-center gap-1.5 text-muted-foreground">
											<IconUserCircle className="size-4" />
											Submitter
										</span>
										<Link
											to="/admin/users/$id"
											params={{ id: submitter.id }}
											data-testid="submission-submitter-link"
											className="flex items-center gap-1 font-medium hover:text-primary hover:underline"
										>
											{`${submitter.firstName ?? ""} ${submitter.lastName ?? ""}`.trim() ||
												"—"}
										</Link>
									</div>

									{submission.type === "ABSTRACT" && (
										<div className="border-t pt-3">
											<p className="mb-1.5 flex items-center gap-1.5 text-muted-foreground">
												<IconRoute className="size-4" />
												Track
											</p>
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
												<SelectTrigger className="w-full">
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
										</div>
									)}
								</CardContent>
							</Card>

							{/* Reviewers */}
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center justify-between text-base">
										<span>
											Reviewers ({completedAssignments.length}/
											{currentRoundAssignments.length})
										</span>
										<span className="text-sm font-normal text-muted-foreground">
											Required: {config.requiredReviewers}
										</span>
									</CardTitle>
								</CardHeader>
								<CardContent className="space-y-3">
									{currentRoundAssignments.length === 0 ? (
										<p className="text-sm text-muted-foreground">
											No reviewers assigned yet
										</p>
									) : (
										<>
											<div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
												<div
													className="h-full rounded-full bg-primary transition-all"
													style={{ width: `${reviewProgress}%` }}
												/>
											</div>
											<div className="space-y-2">
												{currentRoundAssignments.map((assignment) => {
													const overdue = isOverdue(
														assignment.deadline,
														assignment.status,
													);
													return (
														<div
															key={assignment.id}
															className="flex items-start justify-between gap-2 rounded-lg border p-3"
														>
															<div className="min-w-0">
																<div className="truncate text-sm font-medium">
																	{assignment.reviewerName}
																</div>
																<div className="truncate text-xs text-muted-foreground">
																	{assignment.reviewerEmail}
																</div>
																{assignment.deadline &&
																	assignment.status !== "COMPLETED" && (
																		<div
																			className={cn(
																				"mt-1 flex items-center gap-1 text-xs",
																				overdue
																					? "text-destructive"
																					: "text-muted-foreground",
																			)}
																		>
																			<IconClock className="size-3" />
																			{overdue ? "Overdue" : "Due"}{" "}
																			{formatDate(assignment.deadline)}
																		</div>
																	)}
															</div>
															<Badge
																variant={
																	assignmentStatusVariants[
																		assignment.status as keyof typeof assignmentStatusVariants
																	] ?? "outline"
																}
															>
																{assignmentStatusLabels[
																	assignment.status as keyof typeof assignmentStatusLabels
																] ?? assignment.status}
															</Badge>
														</div>
													);
												})}
											</div>
										</>
									)}
								</CardContent>
							</Card>
						</div>
					</div>
				</div>
			</div>

			{/* Dialogs */}
			<AssignReviewerDialog
				submissionId={submission.id}
				submissionTitle={submission.title}
				requiredReviewers={config.requiredReviewers}
				reviewDeadlineDays={config.reviewDeadlineDays}
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

			<DeskAcceptDialog
				submissionId={submission.id}
				submissionTitle={submission.title}
				open={showDeskAcceptDialog}
				onOpenChange={setShowDeskAcceptDialog}
				onAccepted={invalidateSubmission}
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
				revisionUploaded={revisionUploaded}
				latestVersion={submission.currentVersionNumber}
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
