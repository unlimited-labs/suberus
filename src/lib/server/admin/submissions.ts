import { prisma } from "@/db.server";
import { activityDetail } from "@/lib/activity-log";
import { logActivityTx } from "@/lib/server/activity-log";

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

	const activeStatuses = [
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
		select: { id: true, title: true, sequentialNumber: true, userId: true },
	});

	if (!submission) {
		throw new Response("Submission not found", { status: 404 });
	}

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

		// Null out self-referential FKs to avoid circular constraint issues
		await tx.submission.update({
			where: { id: submissionId },
			data: { presenterId: null, currentVersionId: null },
		});

		// Delete submission (cascade handles: versions, authors, keywords,
		// assignments, reviews, decisions, activity logs)
		await tx.submission.delete({ where: { id: submissionId } });
	});

	return { success: true };
}
