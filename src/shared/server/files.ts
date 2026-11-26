import type { SubmissionType, UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/shared/server/db.server";
import {
	type FileAuthzSubmission,
	isReviewFileAuthorized,
	isSubmissionAuthor,
	isSubmissionFileAuthorized,
} from "@/shared/server/file-access-rules";

/** Whose identity the download name must hide; the review mode decides whether it applies. */
export type BlindAs =
	| { hide: "author"; submissionType: SubmissionType; version: number }
	| { hide: "reviewer"; submissionType: SubmissionType }
	| null;

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
	blindAs: BlindAs;
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
		return { authorized: !!file, file, blindAs: null };
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

	if (!file) return { authorized: false, file: null, blindAs: null };

	const access =
		submissionVersionAccess(file.submissionVersions, userId) ??
		(file.submissionVersions.length === 0
			? await reviewAttachmentAccess(fileId, userId)
			: undefined);
	return access
		? { authorized: true, file, blindAs: access.blindAs }
		: { authorized: false, file, blindAs: null };
}

function submissionVersionAccess(
	versions: {
		version: number;
		submission: FileAuthzSubmission & { type: SubmissionType };
	}[],
	userId: string,
): { blindAs: BlindAs } | undefined {
	const granting = versions.filter((v) =>
		isSubmissionFileAuthorized(v.submission, userId),
	);
	const [first] = granting;
	if (!first) return undefined;
	const asAuthor = granting.some((v) =>
		isSubmissionAuthor(v.submission, userId),
	);
	return {
		blindAs: asAuthor
			? null
			: {
					hide: "author",
					submissionType: first.submission.type,
					version: first.version,
				},
	};
}

async function reviewAttachmentAccess(
	fileId: string,
	userId: string,
): Promise<{ blindAs: BlindAs } | undefined> {
	const fileWithEntity = await prisma.file.findUnique({
		where: { id: fileId },
		select: { entityType: true, entityId: true },
	});
	if (fileWithEntity?.entityType !== "REVIEW") return undefined;

	const review = await prisma.review.findUnique({
		where: { id: fileWithEntity.entityId },
		select: {
			reviewerId: true,
			submission: {
				select: {
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
	});
	if (!review || !isReviewFileAuthorized(review, userId)) return undefined;

	return {
		blindAs:
			review.reviewerId === userId
				? null
				: { hide: "reviewer", submissionType: review.submission.type },
	};
}
