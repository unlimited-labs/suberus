import {
	IconArrowLeft,
	IconCalendar,
	IconFileText,
	IconGavel,
	IconHistory,
	IconLoader2,
	IconUsers,
	IconX,
} from "@tabler/icons-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AssignReviewerDialog } from "@/components/admin/submissions/assign-reviewer-dialog";
import { DeskRejectDialog } from "@/components/admin/submissions/desk-reject-dialog";
import { EditorDecisionDialog } from "@/components/admin/submissions/editor-decision-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Timeline, TimelineItem } from "@/components/ui/timeline";
import type {
	SubmissionStatus,
	SubmissionType,
} from "@/generated/prisma/enums";
import {
	statusLabels,
	statusVariants,
	typeLabels,
} from "@/lib/labels/submission";
import { SUBMISSION_TYPE_TO_KEY } from "@/lib/settings/types";
import { getSubmissionForEditorFn } from "@/utils/admin-submissions.functions";
import { getSettingFn } from "@/utils/settings.functions";
import {
	transitionToAwaitingDecisionFn,
	transitionToReviewsCompleteFn,
} from "@/utils/workflow.functions";

export const Route = createFileRoute("/_app/admin/_layout/submissions/$id")({
	component: SubmissionDetailPage,
});

interface SubmissionData {
	submission: {
		id: string;
		title: string;
		content: string;
		type: SubmissionType;
		status: SubmissionStatus;
		currentRound: number;
	};
	authors: Array<{
		firstName: string;
		lastName: string;
		email: string;
		affiliationName: string | null;
		isPresenter: boolean;
	}>;
	assignments: Array<{
		id: string;
		reviewerId: string;
		reviewerName: string;
		reviewerEmail: string;
		status: string;
		round: number;
	}>;
	reviews: Array<{
		id: string;
		reviewerName: string;
		decision: string;
		comments: string | null;
		round: number;
	}>;
	statusHistory: Array<{
		fromStatus: string | null;
		toStatus: string;
		event: string | null;
		reason: string | null;
		createdAt: Date;
		triggeredByName: string | null;
	}>;
}

interface ConfigData {
	minReviewers: number;
	maxReviewers: number;
	requiresEditorDecision: boolean;
	autoTransitionAfterReviews: boolean;
}

function SubmissionDetailPage() {
	const { id } = Route.useParams();

	const [isLoading, setIsLoading] = useState(true);
	const [data, setData] = useState<SubmissionData | null>(null);
	const [config, setConfig] = useState<ConfigData | null>(null);

	const [showAssignDialog, setShowAssignDialog] = useState(false);
	const [showDecisionDialog, setShowDecisionDialog] = useState(false);
	const [showDeskRejectDialog, setShowDeskRejectDialog] = useState(false);
	const [isTransitioning, setIsTransitioning] = useState(false);

	async function loadData() {
		setIsLoading(true);
		try {
			const result = await getSubmissionForEditorFn({
				data: { submissionId: id },
			});
			if (result) {
				setData(result as SubmissionData);

				// Load config for this submission type
				const configKey = SUBMISSION_TYPE_TO_KEY[result.submission.type];
				const configResult = await getSettingFn({ data: { key: configKey } });
				if (configResult) {
					setConfig(configResult as ConfigData);
				}
			}
		} catch (error) {
			console.error("Failed to load submission:", error);
		} finally {
			setIsLoading(false);
		}
	}

	// biome-ignore lint/correctness/useExhaustiveDependencies: loadData is stable
	useEffect(() => {
		loadData();
	}, [id]);

	async function handleTransitionToReviewsComplete() {
		setIsTransitioning(true);
		try {
			const result = await transitionToReviewsCompleteFn({
				data: { submissionId: id },
			});
			if (result.success) {
				toast.success("Transitioned to Reviews Complete");
				await loadData();
			} else {
				toast.error(result.error || "Transition failed");
			}
		} catch (_error) {
			toast.error("Transition failed");
		} finally {
			setIsTransitioning(false);
		}
	}

	async function handleTransitionToAwaitingDecision() {
		setIsTransitioning(true);
		try {
			const result = await transitionToAwaitingDecisionFn({
				data: { submissionId: id },
			});
			if (result.success) {
				toast.success("Transitioned to Awaiting Decision");
				await loadData();
			} else {
				toast.error(result.error || "Transition failed");
			}
		} catch (_error) {
			toast.error("Transition failed");
		} finally {
			setIsTransitioning(false);
		}
	}

	if (isLoading) {
		return (
			<div className="flex h-full flex-col">
				<PageHeader icon={IconFileText} title="Loading..." />
				<div className="flex-1 flex items-center justify-center">
					<IconLoader2 className="size-8 animate-spin text-muted-foreground" />
				</div>
			</div>
		);
	}

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

	// Determine available actions based on status
	const canAssignReviewers =
		["SUBMITTED", "UNDER_REVIEW", "RESUBMITTED"].includes(submission.status) &&
		currentRoundAssignments.length < config.maxReviewers;

	const canDeskReject = submission.status === "SUBMITTED";

	const allReviewsComplete =
		completedAssignments.length >= currentRoundAssignments.length &&
		currentRoundAssignments.length >= config.minReviewers;

	const canTransitionToReviewsComplete =
		submission.status === "UNDER_REVIEW" &&
		allReviewsComplete &&
		!config.autoTransitionAfterReviews;

	const canTransitionToAwaitingDecision =
		submission.status === "REVIEWS_COMPLETE" && config.requiresEditorDecision;

	const canMakeDecision = submission.status === "AWAITING_DECISION";

	const reviewDecisionColors: Record<string, string> = {
		ACCEPT: "bg-green-100 text-green-800",
		ACCEPT_WITH_MINOR_REVISIONS: "bg-blue-100 text-blue-800",
		REVISE_AND_RESUBMIT: "bg-amber-100 text-amber-800",
		REJECT: "bg-red-100 text-red-800",
	};

	const assignmentStatusColors: Record<string, string> = {
		PENDING: "bg-yellow-100 text-yellow-800",
		IN_PROGRESS: "bg-blue-100 text-blue-800",
		COMPLETED: "bg-green-100 text-green-800",
		CANCELLED: "bg-gray-100 text-gray-800",
		OVERDUE: "bg-red-100 text-red-800",
	};

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

							{/* Abstract/Content */}
							<Card>
								<CardHeader>
									<CardTitle className="text-base">Content</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="prose prose-sm max-w-none">
										<p className="whitespace-pre-wrap">{submission.content}</p>
									</div>
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
											Required: {config.minReviewers}-{config.maxReviewers}
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
														{assignment.status}
													</Badge>
												</div>
											))}
										</div>
									)}
								</CardContent>
							</Card>
						</TabsContent>

						<TabsContent value="reviews" className="space-y-4">
							{currentRoundReviews.length === 0 ? (
								<Card>
									<CardContent className="py-8 text-center text-muted-foreground">
										No reviews submitted yet for this round
									</CardContent>
								</Card>
							) : (
								currentRoundReviews.map((review) => (
									<Card key={review.id}>
										<CardHeader>
											<div className="flex items-center justify-between">
												<CardTitle className="text-base">
													{review.reviewerName}
												</CardTitle>
												<Badge
													variant="outline"
													className={reviewDecisionColors[review.decision]}
												>
													{review.decision.replace(/_/g, " ")}
												</Badge>
											</div>
										</CardHeader>
										<CardContent>
											{review.comments ? (
												<p className="text-sm whitespace-pre-wrap">
													{review.comments}
												</p>
											) : (
												<p className="text-sm text-muted-foreground italic">
													No comments provided
												</p>
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
														{new Date(entry.createdAt).toLocaleString()}
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
				minReviewers={config.minReviewers}
				maxReviewers={config.maxReviewers}
				open={showAssignDialog}
				onOpenChange={setShowAssignDialog}
				onAssigned={loadData}
			/>

			<EditorDecisionDialog
				submissionId={submission.id}
				submissionTitle={submission.title}
				reviews={currentRoundReviews}
				open={showDecisionDialog}
				onOpenChange={setShowDecisionDialog}
				onDecisionMade={loadData}
			/>

			<DeskRejectDialog
				submissionId={submission.id}
				submissionTitle={submission.title}
				open={showDeskRejectDialog}
				onOpenChange={setShowDeskRejectDialog}
				onRejected={loadData}
			/>
		</div>
	);
}
