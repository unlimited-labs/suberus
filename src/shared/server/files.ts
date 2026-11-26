import type { SubmissionType, UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/shared/server/db.server";
import {
	isReviewFileAuthorized,
	isSubmissionAuthor,
	isSubmissionFileAuthorized,
} from "@/shared/server/file-access-rules";

export async function checkFileAccess(
	fileId: string,
	userId: string,
	userRole: UserRole,
): Promise<{
	authorized: boolean;
	file: {
		id: string;
		storageKey: string;
		fileName: string;
		originalName: string;
		mimeType: string;
		size: number;
	} | null;
	/** Set when only a review assignment grants access, so double-blind can hide the author. */
	reviewerView: { submissionType: SubmissionType; version: number } | null;
}> {
	if (userRole === "EDITOR" || userRole === "ADMIN") {
		const file = await prisma.file.findUnique({
			where: { id: fileId },
			select: {
				id: true,
				storageKey: true,
				fileName: true,
				originalName: true,
				mimeType: true,
				size: true,
			},
		});
		return { authorized: !!file, file, reviewerView: null };
	}

	const file = await prisma.file.findUnique({
		where: { id: fileId },
		select: {
			id: true,
			storageKey: true,
			fileName: true,
			originalName: true,
			mimeType: true,
			size: true,
			submissionVersions: {
				orderBy: { version: "asc" },
				select: {
					version: true,
					submission: {
						select: {
							id: true,
							type: true,
							userId: true,
							authors: { select: { userId: true } },
							reviewAssignments: {
								where: { status: { not: "CANCELLED" } },
								select: { reviewerId: true },
							},
						},
					},
				},
			},
		},
	});

	if (!file) return { authorized: false, file: null, reviewerView: null };

	const granting = file.submissionVersions.filter((v) =>
		isSubmissionFileAuthorized(v.submission, userId),
	);
	const [first] = granting;
	if (first) {
		const asAuthor = granting.some((v) =>
			isSubmissionAuthor(v.submission, userId),
		);
		return {
			authorized: true,
			file,
			reviewerView: asAuthor
				? null
				: { submissionType: first.submission.type, version: first.version },
		};
	}

	if (file.submissionVersions.length === 0) {
		const fileWithEntity = await prisma.file.findUnique({
			where: { id: fileId },
			select: { entityType: true, entityId: true },
		});

		if (fileWithEntity?.entityType === "REVIEW") {
			const review = await prisma.review.findUnique({
				where: { id: fileWithEntity.entityId },
				select: {
					reviewerId: true,
					submission: {
						select: {
							userId: true,
							authors: { select: { userId: true } },
							reviewAssignments: {
								where: { status: { not: "CANCELLED" } },
								select: { reviewerId: true },
							},
						},
					},
				},
			});

			if (review && isReviewFileAuthorized(review, userId)) {
				return { authorized: true, file, reviewerView: null };
			}
		}
	}

	return { authorized: false, file, reviewerView: null };
}
