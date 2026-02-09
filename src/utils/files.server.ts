import { prisma } from "@/db.server";
import type { UserRole } from "@/generated/prisma/enums";
import { deleteFile } from "@/lib/server/storage";

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
		const submission = version.submission;

		// Author (submission owner)
		if (submission.userId === userId) {
			return { authorized: true, file };
		}

		// Co-author
		if (submission.authors.some((a) => a.userId === userId)) {
			return { authorized: true, file };
		}

		// Assigned reviewer (non-cancelled)
		if (submission.reviewAssignments.some((a) => a.reviewerId === userId)) {
			return { authorized: true, file };
		}
	}

	return { authorized: false, file };
}

/** Delete all files (S3 + DB) for a submission */
export async function deleteSubmissionFiles(
	submissionId: string,
): Promise<void> {
	const versions = await prisma.submissionVersion.findMany({
		where: { submissionId },
		include: { file: true },
	});

	for (const version of versions) {
		if (version.file) {
			// Remove S3 object
			await deleteFile(version.file.storageKey).catch(() => {});
			// Unlink from version first, then delete file record
			await prisma.submissionVersion.update({
				where: { id: version.id },
				data: { fileId: null },
			});
			await prisma.file.delete({ where: { id: version.file.id } });
		}
	}
}
