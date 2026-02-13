import { prisma } from "@/db.server";
import type { ReviewDecision, ReviewMode } from "@/generated/prisma/enums";
import { sendEmail } from "@/lib/server/email";
import { SUBMISSION_TYPE_TO_KEY } from "@/lib/settings/types";
import { completeReviewAssignment, startReview } from "./assignments.server";
import { getSetting } from "./settings.server";
import { checkAndTriggerReviewCompletion } from "./workflow.server";

/** Review submission data */
export interface ReviewSubmitData {
	decision: ReviewDecision;
	comments: string;
	privateNotes?: string;
	scores?: Record<string, number>;
	confidenceLevel?: number;
}

/** Get assignment details for review form */
export async function getAssignmentForReview(
	assignmentId: string,
	reviewerId: string,
): Promise<{
	assignment: {
		id: string;
		submissionId: string;
		round: number;
		status: string;
		deadline: Date | null;
	};
	submission: {
		id: string;
		title: string;
		content: string;
		type: string;
		authors: Array<{
			firstName: string;
			lastName: string;
			affiliationName: string | null;
			isPresenter: boolean;
		}>;
		file: {
			id: string;
			fileName: string;
			originalName: string;
			mimeType: string;
			size: number;
		} | null;
	};
	config: {
		reviewMode: ReviewMode;
		enableScoring: boolean;
		scoringCriteria: { name: string; description: string }[];
		enableConfidenceLevel: boolean;
	};
	existingReview?: {
		decision: ReviewDecision;
		comments: string | null;
		privateNotes: string | null;
		scores: Record<string, number> | null;
		confidenceLevel: number | null;
	};
} | null> {
	const assignment = await prisma.reviewAssignment.findUnique({
		where: { id: assignmentId },
		include: {
			submission: {
				include: {
					authors: {
						include: { affiliation: true },
						orderBy: { orderIndex: "asc" },
					},
					currentVersion: {
						include: {
							file: {
								select: {
									id: true,
									fileName: true,
									originalName: true,
									mimeType: true,
									size: true,
								},
							},
						},
					},
				},
			},
			review: true,
		},
	});

	if (!assignment) return null;

	// Verify reviewer ownership
	if (assignment.reviewerId !== reviewerId) return null;

	// Get config for submission type
	const configKey = SUBMISSION_TYPE_TO_KEY[assignment.submission.type];
	const config = await getSetting(configKey);

	return {
		assignment: {
			id: assignment.id,
			submissionId: assignment.submissionId,
			round: assignment.round,
			status: assignment.status,
			deadline: assignment.deadline,
		},
		submission: {
			id: assignment.submission.id,
			title: assignment.submission.title,
			content:
				assignment.submission.currentVersion?.content ??
				assignment.submission.content,
			type: assignment.submission.type,
			authors: assignment.submission.authors.map((a) => ({
				firstName: a.firstName,
				lastName: a.lastName,
				affiliationName: a.affiliation?.name ?? null,
				isPresenter: a.isPresenter,
			})),
			file: assignment.submission.currentVersion?.file ?? null,
		},
		config: {
			reviewMode: config.reviewMode,
			enableScoring: config.enableScoring,
			scoringCriteria: config.scoringCriteria,
			enableConfidenceLevel: config.enableConfidenceLevel,
		},
		existingReview: assignment.review
			? {
					decision: assignment.review.decision,
					comments: assignment.review.comments,
					privateNotes: assignment.review.privateNotes,
					scores: (assignment.review.scores as Record<string, number>) ?? null,
					confidenceLevel: assignment.review.confidenceLevel,
				}
			: undefined,
	};
}

/** Submit a review */
export async function submitReview(
	assignmentId: string,
	reviewerId: string,
	data: ReviewSubmitData,
): Promise<{ success: boolean; error?: string }> {
	const assignment = await prisma.reviewAssignment.findUnique({
		where: { id: assignmentId },
		include: {
			submission: true,
			review: true,
		},
	});

	if (!assignment) {
		return { success: false, error: "Assignment not found" };
	}

	if (assignment.reviewerId !== reviewerId) {
		return { success: false, error: "Not assigned to this reviewer" };
	}

	if (assignment.status === "CANCELLED") {
		return { success: false, error: "Assignment has been cancelled" };
	}

	// Start review if not already started
	if (assignment.status === "PENDING") {
		await startReview(assignmentId, reviewerId);
	}

	// Check if review already exists (update vs create)
	if (assignment.review) {
		// Update existing review
		await prisma.review.update({
			where: { id: assignment.review.id },
			data: {
				decision: data.decision,
				comments: data.comments,
				privateNotes: data.privateNotes,
				scores: data.scores ?? undefined,
				confidenceLevel: data.confidenceLevel,
			},
		});
	} else {
		// Create new review
		await prisma.review.create({
			data: {
				assignmentId,
				submissionId: assignment.submissionId,
				reviewerId,
				versionId: assignment.submission.currentVersionId,
				round: assignment.round,
				decision: data.decision,
				comments: data.comments,
				privateNotes: data.privateNotes,
				scores: data.scores ?? undefined,
				confidenceLevel: data.confidenceLevel,
			},
		});
	}

	// Mark assignment as completed
	if (assignment.status !== "COMPLETED") {
		await completeReviewAssignment(assignmentId, reviewerId);
	}

	// Check if all reviews are complete and trigger auto-transition
	await checkAndTriggerReviewCompletion(assignment.submissionId, reviewerId);

	// Notify editor(s) that a review was submitted
	if (assignment.assignedBy) {
		const editor = await prisma.user.findUnique({
			where: { id: assignment.assignedBy },
			select: { email: true },
		});

		if (editor) {
			const reviewer = await prisma.user.findUniqueOrThrow({
				where: { id: reviewerId },
				select: { firstName: true, lastName: true, email: true },
			});

			void sendEmail("REVIEW_SUBMITTED", editor.email, {
				submissionTitle: assignment.submission.title,
				reviewerName:
					`${reviewer.firstName ?? ""} ${reviewer.lastName ?? ""}`.trim() ||
					reviewer.email,
				submissionUrl: `${process.env.AUTH_URL}/admin/submissions/${assignment.submissionId}`,
			});
		}
	}

	return { success: true };
}

/** Get reviews for a submission (editor view) */
export async function getSubmissionReviews(
	submissionId: string,
	round?: number,
): Promise<
	Array<{
		id: string;
		reviewerName: string;
		reviewerEmail: string;
		round: number;
		decision: ReviewDecision;
		comments: string | null;
		privateNotes: string | null;
		scores: Record<string, number> | null;
		confidenceLevel: number | null;
		createdAt: Date;
	}>
> {
	const submission = await prisma.submission.findUniqueOrThrow({
		where: { id: submissionId },
		select: { currentRound: true },
	});

	const targetRound = round ?? submission.currentRound;

	const reviews = await prisma.review.findMany({
		where: { submissionId, round: targetRound },
		include: {
			reviewer: {
				select: { firstName: true, lastName: true, email: true },
			},
		},
		orderBy: { createdAt: "asc" },
	});

	return reviews.map((r) => ({
		id: r.id,
		reviewerName:
			`${r.reviewer.firstName ?? ""} ${r.reviewer.lastName ?? ""}`.trim() ||
			r.reviewer.email,
		reviewerEmail: r.reviewer.email,
		round: r.round,
		decision: r.decision,
		comments: r.comments,
		privateNotes: r.privateNotes,
		scores: (r.scores as Record<string, number>) ?? null,
		confidenceLevel: r.confidenceLevel,
		createdAt: r.createdAt,
	}));
}
