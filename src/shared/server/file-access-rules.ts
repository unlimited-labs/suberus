export interface FileAuthzSubmission {
	userId: string;
	authors: { userId: string | null }[];
	reviewAssignments: { reviewerId: string }[];
}

export function isSubmissionFileAuthorized(
	submission: FileAuthzSubmission,
	userId: string,
): boolean {
	if (submission.userId === userId) return true;
	if (submission.authors.some((a) => a.userId === userId)) return true;
	return submission.reviewAssignments.some((a) => a.reviewerId === userId);
}

export function isReviewFileAuthorized(
	review: { reviewerId: string; submission: FileAuthzSubmission },
	userId: string,
): boolean {
	if (review.reviewerId === userId) return true;
	return isSubmissionFileAuthorized(review.submission, userId);
}
