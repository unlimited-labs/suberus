import { env } from "@/env.ts";
import { logActivity } from "@/features/activity-log/server/activity-log";
import { activityDetail } from "@/features/activity-log/types";
import { SUPPORTED_FILE_EXTENSIONS } from "@/features/settings/file-types";
import { getSetting } from "@/features/settings/server/settings";
import { SUBMISSION_TYPE_TO_KEY } from "@/features/settings/types";
import {
	checkAndTriggerReviewCompletion,
	validateAssignmentTransition,
} from "@/features/workflow/server/workflow";
import type { ReviewDecision, ReviewMode } from "@/generated/prisma/enums";
import { logger } from "@/logger.ts";
import { prisma } from "@/shared/server/db.server";
import { sendEmail } from "@/shared/server/email";
import { fileToBuffer } from "@/shared/server/form-upload";
import {
	deleteFile,
	generateReviewFileKey,
	uploadFile,
} from "@/shared/server/storage";
import {
	UploadValidationError,
	validateUpload,
} from "@/shared/server/validate-upload";

/** Review submission data */
export interface ReviewSubmitData {
	decision: ReviewDecision;
	comments: string;
	privateNotes?: string;
	scores?: Record<string, number>;
	confidenceLevel?: number;
}

/** Get assignment details for review form */
/** The version immediately preceding the current one, for a round-over-round diff. */
function resolvePreviousVersion(
	versions: { version: number; title: string; content: string }[],
	currentVersionNumber: number | undefined,
): { title: string; content: string } | null {
	if (currentVersionNumber === undefined) return null;
	// `versions` is ordered version-desc, so the first one below current is the previous.
	const previous = versions.find((v) => v.version < currentVersionNumber);
	return previous ? { title: previous.title, content: previous.content } : null;
}

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
		/** Immediately-preceding version (round-over-round diff), if any. */
		previousVersion: { title: string; content: string } | null;
		currentVersionNumber: number;
		/**
		 * All versions for the side-by-side compare page. Blind-safe: only
		 * versioned fields (title/content/file); `comment` (author's note) is
		 * dropped to avoid leaking author identity in blind review.
		 */
		versions: Array<{
			id: string;
			version: number;
			title: string;
			content: string;
			comment: string | null;
			createdAt: Date;
			file: {
				id: string;
				fileName: string;
				originalName: string;
				mimeType: string;
				size: number;
			} | null;
		}>;
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
					versions: {
						select: {
							id: true,
							version: true,
							title: true,
							content: true,
							createdAt: true,
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
						orderBy: { version: "desc" },
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
			previousVersion: resolvePreviousVersion(
				assignment.submission.versions,
				assignment.submission.currentVersion?.version,
			),
			currentVersionNumber: assignment.submission.currentVersion?.version ?? 1,
			versions: assignment.submission.versions.map((v) => ({
				id: v.id,
				version: v.version,
				title: v.title,
				content: v.content,
				comment: null,
				createdAt: v.createdAt,
				file: v.file,
			})),
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

function isValidScore(score: number | undefined): boolean {
	return score !== undefined && score >= 1 && score <= 5;
}

function findInvalidScoreError(
	criteriaNames: string[],
	scores: Record<string, number>,
): string | null {
	for (const name of criteriaNames) {
		if (!isValidScore(scores[name])) {
			return `Score for "${name}" is required (1-5)`;
		}
	}
	return null;
}

/** Validate scores against criteria and return the normalized score map. */
function validateScores(
	criteriaNames: string[],
	scores: Record<string, number> | undefined,
): { error: string } | { scores: Record<string, number> } {
	if (!scores || criteriaNames.length === 0) {
		return { error: "Scores are required when scoring is enabled" };
	}
	const invalid = findInvalidScoreError(criteriaNames, scores);
	if (invalid) return { error: invalid };
	return {
		scores: Object.fromEntries(
			criteriaNames.map((name) => [name, scores[name]]),
		),
	};
}

function validateConfidence(level: number | undefined): string | null {
	if (!level || level < 1 || level > 5) {
		return "Confidence level is required (1-5)";
	}
	return null;
}

/** Validate the scores field against config; returns the normalized value or an error. */
function validateScoresField(
	config: { enableScoring: boolean; scoringCriteria: { name: string }[] },
	scores: Record<string, number> | undefined,
): { error: string } | { value: Record<string, number> | undefined } {
	if (!config.enableScoring) return { value: undefined };
	const criteriaNames = config.scoringCriteria.map((c) => c.name);
	const result = validateScores(criteriaNames, scores);
	if ("error" in result) return { error: result.error };
	return { value: result.scores };
}

/** Validate the confidence field against config; returns the value or an error. */
function validateConfidenceField(
	config: { enableConfidenceLevel: boolean },
	level: number | undefined,
): { error: string } | { value: number | undefined } {
	if (!config.enableConfidenceLevel) return { value: undefined };
	const error = validateConfidence(level);
	if (error) return { error };
	return { value: level };
}

function formatReviewerName(reviewer: {
	firstName: string | null;
	lastName: string | null;
	email: string;
}): string {
	return (
		`${reviewer.firstName ?? ""} ${reviewer.lastName ?? ""}`.trim() ||
		reviewer.email
	);
}

/** Notify the assigning editor that a review was submitted. */
async function notifyEditorReviewSubmitted(
	assignment: {
		assignedBy: string | null;
		submissionId: string;
		submission: { title: string };
	},
	reviewerId: string,
): Promise<void> {
	if (!assignment.assignedBy) return;

	const editor = await prisma.user.findUnique({
		where: { id: assignment.assignedBy },
		select: { email: true },
	});
	if (!editor) return;

	const reviewer = await prisma.user.findUniqueOrThrow({
		where: { id: reviewerId },
		select: { firstName: true, lastName: true, email: true },
	});

	void sendEmail("REVIEW_SUBMITTED", editor.email, {
		submissionTitle: assignment.submission.title,
		reviewerName: formatReviewerName(reviewer),
		submissionUrl: `${env.APP_BASE_URL}/admin/submissions/${assignment.submissionId}`,
	});
}

/** Load the assignment and authorize the reviewer + workflow transition. */
async function loadAssignmentForSubmit(
	assignmentId: string,
	reviewerId: string,
	decision: ReviewDecision,
) {
	const assignment = await prisma.reviewAssignment.findUnique({
		where: { id: assignmentId },
		include: {
			submission: true,
			review: true,
		},
	});

	if (!assignment) return { error: "Assignment not found" };
	if (assignment.reviewerId !== reviewerId) {
		return { error: "Not assigned to this reviewer" };
	}

	// Validate transition through xstate (single source of truth)
	const validation = await validateAssignmentTransition(assignmentId, {
		type: "COMPLETE",
		decision,
	});
	if (!validation.valid) return { error: validation.error };

	return { assignment };
}

/** Submit a review */
export async function submitReview(
	assignmentId: string,
	reviewerId: string,
	data: ReviewSubmitData,
): Promise<{ success: boolean; reviewId?: string; error?: string }> {
	const loaded = await loadAssignmentForSubmit(
		assignmentId,
		reviewerId,
		data.decision,
	);
	if ("error" in loaded) return { success: false, error: loaded.error };
	const { assignment } = loaded;

	// Load config for server-side validation of scores/confidence
	const configKey = SUBMISSION_TYPE_TO_KEY[assignment.submission.type];
	const config = await getSetting(configKey);

	const scoresResult = validateScoresField(config, data.scores);
	if ("error" in scoresResult) {
		return { success: false, error: scoresResult.error };
	}

	const confidenceResult = validateConfidenceField(
		config,
		data.confidenceLevel,
	);
	if ("error" in confidenceResult) {
		return { success: false, error: confidenceResult.error };
	}

	const reviewData = {
		decision: data.decision,
		comments: data.comments,
		privateNotes: data.privateNotes,
		scores: scoresResult.value,
		confidenceLevel: confidenceResult.value,
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
	await notifyEditorReviewSubmitted(assignment, reviewerId);

	await logActivity({
		type: "REVIEW_SUBMITTED",
		submissionId: assignment.submissionId,
		userId: reviewerId,
		performedBy: reviewerId,
		detail: activityDetail("REVIEW_SUBMITTED", { decision: data.decision }),
	});

	return { success: true, reviewId };
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
