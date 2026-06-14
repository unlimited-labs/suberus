/** Pure authorization rules for file downloads (no DB/IO — unit-testable). */

/** Submission shape needed to authorize access to its files. */
export interface FileAuthzSubmission {
	userId: string;
	authors: { userId: string | null }[];
	reviewAssignments: { reviewerId: string }[];
}

/** A user may access a submission's files if they own it, co-author it, or are an active reviewer. */
export function isSubmissionFileAuthorized(
	submission: FileAuthzSubmission,
	userId: string,
): boolean {
	if (submission.userId === userId) return true;
	if (submission.authors.some((a) => a.userId === userId)) return true;
	return submission.reviewAssignments.some((a) => a.reviewerId === userId);
}

/** A user may access a review attachment if they wrote it, or have submission-level access. */
export function isReviewFileAuthorized(
	review: { reviewerId: string; submission: FileAuthzSubmission },
	userId: string,
): boolean {
	if (review.reviewerId === userId) return true;
	return isSubmissionFileAuthorized(review.submission, userId);
}
