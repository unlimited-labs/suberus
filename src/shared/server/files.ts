import type { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/shared/server/db.server";
import {
	isReviewFileAuthorized,
	isSubmissionFileAuthorized,
} from "@/shared/server/file-access-rules";

/** Check if a user has access to download a file */
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
}> {
	// Editors and admins can access any file
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
		return { authorized: !!file, file };
	}

	// Find file and its linked submission version
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
				select: {
					submission: {
						select: {
							id: true,
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

	if (!file) return { authorized: false, file: null };

	// Check access through any linked submission version
	for (const version of file.submissionVersions) {
		if (isSubmissionFileAuthorized(version.submission, userId)) {
			return { authorized: true, file };
		}
	}

	// Check access for review attachment files (entityType=REVIEW)
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
				return { authorized: true, file };
			}
		}
	}

	return { authorized: false, file };
}
