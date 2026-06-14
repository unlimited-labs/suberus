import { env } from "@/env.ts";
import {
	checkAndTriggerReviewCompletion,
	validateAssignmentTransition,
} from "@/features/workflow/server/workflow";
import type { ReviewDecision, ReviewMode } from "@/generated/prisma/enums";
import { activityDetail } from "@/lib/activity-log";
import { logActivity } from "@/lib/server/activity-log";
import { fileToBuffer } from "@/lib/server/form-upload";
import { getSetting } from "@/lib/server/settings";
import {
	UploadValidationError,
	validateUpload,
} from "@/lib/server/validate-upload";
import { SUPPORTED_FILE_EXTENSIONS } from "@/lib/settings/file-types";
import { SUBMISSION_TYPE_TO_KEY } from "@/lib/settings/types";
import { logger } from "@/logger.ts";
import { prisma } from "@/shared/server/db.server";
import { sendEmail } from "@/shared/server/email";
import {
	deleteFile,
	generateReviewFileKey,
	uploadFile,
} from "@/shared/server/storage";

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
		enableReviewAttachment: boolean;
	};
	existingReview?: {
		decision: ReviewDecision;
		comments: string | null;
		privateNotes: string | null;
		scores: Record<string, number> | null;
		confidenceLevel: number | null;
	};
	existingAttachment?: {
		id: string;
		fileName: string;
		originalName: string;
		size: number;
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
			authors:
				config.reviewMode === "DOUBLE_BLIND"
					? []
					: assignment.submission.authors.map((a) => ({
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
			enableReviewAttachment: config.enableReviewAttachment ?? true,
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
		existingAttachment: await (async () => {
			if (!assignment.review) return undefined;
			const att = await prisma.file.findFirst({
				where: {
					entityType: "REVIEW",
					entityId: assignment.review.id,
					type: "REVIEW_ATTACHMENT",
				},
				select: { id: true, fileName: true, originalName: true, size: true },
			});
			return att ?? undefined;
		})(),
	};
}

/** Submit a review */
export async function submitReview(
	assignmentId: string,
	reviewerId: string,
	data: ReviewSubmitData,
): Promise<{ success: boolean; reviewId?: string; error?: string }> {
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

	// Validate transition through xstate (single source of truth)
	const validation = await validateAssignmentTransition(assignmentId, {
		type: "COMPLETE",
		decision: data.decision,
	});
	if (!validation.valid) {
		return { success: false, error: validation.error };
	}

	// Load config for server-side validation of scores/confidence
	const configKey = SUBMISSION_TYPE_TO_KEY[assignment.submission.type];
	const config = await getSetting(configKey);

	// Validate scores when scoring is enabled
	let validatedScores: Record<string, number> | undefined;
	if (config.enableScoring) {
		const criteriaNames = config.scoringCriteria.map(
			(c: { name: string }) => c.name,
		);
		if (!data.scores || criteriaNames.length === 0) {
			return {
				success: false,
				error: "Scores are required when scoring is enabled",
			};
		}
		for (const name of criteriaNames) {
			const score = data.scores[name];
			if (score === undefined || score < 1 || score > 5) {
				return {
					success: false,
					error: `Score for "${name}" is required (1-5)`,
				};
			}
		}
		const scores = data.scores;
		validatedScores = Object.fromEntries(
			criteriaNames.map((name) => [name, scores[name]]),
		);
	}

	// Validate confidence level when enabled
	let validatedConfidence: number | undefined;
	if (config.enableConfidenceLevel) {
		if (
			!data.confidenceLevel ||
			data.confidenceLevel < 1 ||
			data.confidenceLevel > 5
		) {
			return { success: false, error: "Confidence level is required (1-5)" };
		}
		validatedConfidence = data.confidenceLevel;
	}

	const reviewData = {
		decision: data.decision,
		comments: data.comments,
		privateNotes: data.privateNotes,
		scores: validatedScores,
		confidenceLevel: validatedConfidence,
	};

	// Atomic: review create/update + assignment completion in one transaction
	const now = new Date();

	const reviewId = await prisma.$transaction(async (tx) => {
		let id: string;
		if (assignment.review) {
			await tx.review.update({
				where: { id: assignment.review.id },
				data: reviewData,
			});
			id = assignment.review.id;
		} else {
			const created = await tx.review.create({
				data: {
					assignmentId,
					submissionId: assignment.submissionId,
					reviewerId,
					versionId: assignment.submission.currentVersionId,
					round: assignment.round,
					...reviewData,
				},
			});
			id = created.id;
		}

		await tx.reviewAssignment.update({
			where: { id: assignmentId },
			data: {
				status: "COMPLETED",
				completedAt: now,
			},
		});

		return id;
	});

	// After transaction: trigger auto-transition if all reviews complete
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
				submissionUrl: `${env.APP_BASE_URL}/admin/submissions/${assignment.submissionId}`,
			});
		}
	}

	await logActivity({
		type: "REVIEW_SUBMITTED",
		submissionId: assignment.submissionId,
		userId: reviewerId,
		performedBy: reviewerId,
		detail: activityDetail("REVIEW_SUBMITTED", { decision: data.decision }),
	});

	return { success: true, reviewId };
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
		attachment: {
			id: string;
			fileName: string;
			originalName: string;
			size: number;
		} | null;
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

	// Load attachments for all reviews
	const reviewIds = reviews.map((r) => r.id);
	const attachments = await prisma.file.findMany({
		where: {
			entityType: "REVIEW",
			entityId: { in: reviewIds },
			type: "REVIEW_ATTACHMENT",
		},
		select: {
			id: true,
			entityId: true,
			fileName: true,
			originalName: true,
			size: true,
		},
	});
	const attachmentByReviewId = new Map(attachments.map((a) => [a.entityId, a]));

	return reviews.map((r) => {
		const att = attachmentByReviewId.get(r.id);
		return {
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
			attachment: att
				? {
						id: att.id,
						fileName: att.fileName,
						originalName: att.originalName,
						size: att.size,
					}
				: null,
			createdAt: r.createdAt,
		};
	});
}

/** Upload a file attachment for a review */
export async function uploadReviewAttachment(
	reviewId: string,
	userId: string,
	upload: File,
): Promise<{ success: boolean; fileId?: string; error?: string }> {
	// Verify reviewer owns this review
	const review = await prisma.review.findUnique({
		where: { id: reviewId },
		select: { id: true, reviewerId: true },
	});

	if (!review) {
		return { success: false, error: "Review not found" };
	}
	if (review.reviewerId !== userId) {
		return { success: false, error: "Not authorized" };
	}

	const fileName = upload.name;
	const buffer = await fileToBuffer(upload);

	// Validate by magic number — reviewers may attach a PDF or DOCX only.
	const maxBytes = (await getSetting("MAX_FILE_SIZE_MB")) * 1024 * 1024;
	let detected: { ext: string; mime: string };
	try {
		detected = await validateUpload(buffer, {
			allowedExtensions: SUPPORTED_FILE_EXTENSIONS,
			maxBytes,
		});
	} catch (error) {
		if (error instanceof UploadValidationError) {
			return { success: false, error: error.message };
		}
		throw error;
	}

	const storageKey = generateReviewFileKey(reviewId, fileName);

	// Upload to S3 with the detected (trustworthy) mime type
	await uploadFile(buffer, storageKey, detected.mime);

	// Delete existing attachment if any (1 file per review)
	const existingFile = await prisma.file.findFirst({
		where: {
			entityType: "REVIEW",
			entityId: reviewId,
			type: "REVIEW_ATTACHMENT",
		},
	});

	if (existingFile) {
		await deleteFile(existingFile.storageKey).catch((err) => {
			logger.error(
				`[files] failed to delete old review attachment ${existingFile.storageKey}:`,
				err,
			);
		});
		await prisma.file.delete({ where: { id: existingFile.id } });
	}

	// Create file record
	const file = await prisma.file.create({
		data: {
			entityType: "REVIEW",
			entityId: reviewId,
			type: "REVIEW_ATTACHMENT",
			storageKey,
			fileName,
			originalName: fileName,
			mimeType: detected.mime,
			size: buffer.length,
			uploadedById: userId,
		},
	});

	return { success: true, fileId: file.id };
}
