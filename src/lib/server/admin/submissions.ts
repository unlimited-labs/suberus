import { prisma } from "@/db.server";
import type { SubmissionStatus } from "@/generated/prisma/enums";
import { activityDetail } from "@/lib/activity-log";
import { logActivityTx } from "@/lib/server/activity-log";
import { deleteFile } from "@/lib/server/storage";

export interface SubmissionDeleteWarnings {
	warnings: string[];
}

export async function checkSubmissionDeleteWarnings(
	submissionId: string,
): Promise<SubmissionDeleteWarnings> {
	const submission = await prisma.submission.findUnique({
		where: { id: submissionId },
		select: {
			status: true,
			_count: {
				select: {
					reviews: true,
					reviewAssignments: true,
					editorDecisions: true,
				},
			},
		},
	});

	if (!submission) {
		throw new Response("Submission not found", { status: 404 });
	}

	const warnings: string[] = [];

	const activeStatuses: SubmissionStatus[] = [
		"UNDER_REVIEW",
		"REVIEWS_COMPLETE",
		"AWAITING_DECISION",
	];
	if (activeStatuses.includes(submission.status)) {
		warnings.push("Submission is in an active review process");
	}

	if (submission._count.reviewAssignments > 0) {
		warnings.push(
			`${submission._count.reviewAssignments} reviewer assignment(s) will be deleted`,
		);
	}

	if (submission._count.reviews > 0) {
		warnings.push(
			`${submission._count.reviews} review(s) will be permanently lost`,
		);
	}

	if (submission._count.editorDecisions > 0) {
		warnings.push(
			`${submission._count.editorDecisions} editor decision(s) will be permanently lost`,
		);
	}

	return { warnings };
}

export async function deleteSubmission(
	submissionId: string,
	performedBy: string,
): Promise<{ success: boolean }> {
	const submission = await prisma.submission.findUnique({
		where: { id: submissionId },
		select: {
			id: true,
			title: true,
			sequentialNumber: true,
			userId: true,
			versions: {
				select: { file: { select: { id: true, storageKey: true } } },
			},
			reviews: {
				select: { id: true },
			},
		},
	});

	if (!submission) {
		throw new Response("Submission not found", { status: 404 });
	}

	// Collect file storage keys for cleanup after transaction
	const versionFileKeys = submission.versions
		.map((v) => v.file)
		.filter((f): f is { id: string; storageKey: string } => f !== null);

	// Also collect review attachment files
	const reviewIds = submission.reviews.map((r) => r.id);
	const reviewFiles =
		reviewIds.length > 0
			? await prisma.file.findMany({
					where: { entityType: "REVIEW", entityId: { in: reviewIds } },
					select: { id: true, storageKey: true },
				})
			: [];

	const fileKeys = [...versionFileKeys, ...reviewFiles];

	await prisma.$transaction(async (tx) => {
		// Log deletion as a user-level activity (no submissionId — it's being deleted)
		await logActivityTx(tx, {
			type: "SUBMISSION_DELETED",
			userId: submission.userId,
			performedBy,
			detail: activityDetail("SUBMISSION_DELETED", {
				title: submission.title,
				sequentialNumber: submission.sequentialNumber,
			}),
		});

		// Clean up orphaned SentReminder rows (no FK relation to submission)
		await tx.sentReminder.deleteMany({
			where: { entityId: submissionId },
		});

		// Null out self-referential FKs to avoid circular constraint issues
		await tx.submission.update({
			where: { id: submissionId },
			data: { presenterId: null, currentVersionId: null },
		});

		// Unlink files from versions before deleting file records
		if (fileKeys.length > 0) {
			await tx.submissionVersion.updateMany({
				where: { submissionId },
				data: { fileId: null },
			});
			await tx.file.deleteMany({
				where: { id: { in: fileKeys.map((f) => f.id) } },
			});
		}

		// Delete submission (cascade handles: versions, authors, keywords,
		// assignments, reviews, decisions, activity logs)
		await tx.submission.delete({ where: { id: submissionId } });
	});

	// Clean up storage blobs (best-effort, after transaction success)
	await Promise.allSettled(fileKeys.map((f) => deleteFile(f.storageKey)));

	return { success: true };
}
