import { describe, expect, it } from "vitest";
import {
	type FileAuthzSubmission,
	isReviewFileAuthorized,
	isSubmissionFileAuthorized,
} from "./file-access-rules";

// reviewAssignments are pre-filtered to non-cancelled by the query; the rules
// assume that and only check membership.
const submission = (
	overrides: Partial<FileAuthzSubmission> = {},
): FileAuthzSubmission => ({
	userId: "owner",
	authors: [{ userId: "owner" }, { userId: "coauthor" }],
	reviewAssignments: [{ reviewerId: "reviewer" }],
	...overrides,
});

describe("isSubmissionFileAuthorized", () => {
	it("grants the owner", () => {
		expect(isSubmissionFileAuthorized(submission(), "owner")).toBe(true);
	});

	it("grants a co-author", () => {
		expect(isSubmissionFileAuthorized(submission(), "coauthor")).toBe(true);
	});

	it("grants an assigned reviewer", () => {
		expect(isSubmissionFileAuthorized(submission(), "reviewer")).toBe(true);
	});

	it("denies an unrelated user", () => {
		expect(isSubmissionFileAuthorized(submission(), "stranger")).toBe(false);
	});

	it("ignores authors with a null userId", () => {
		expect(
			isSubmissionFileAuthorized(
				submission({ authors: [{ userId: null }], reviewAssignments: [] }),
				"owner-x",
			),
		).toBe(false);
	});
});

describe("isReviewFileAuthorized", () => {
	const review = (reviewerId: string, sub = submission()) => ({
		reviewerId,
		submission: sub,
	});

	it("grants the reviewer who uploaded it", () => {
		expect(
			isReviewFileAuthorized(review("author-of-review"), "author-of-review"),
		).toBe(true);
	});

	it("grants the submission owner", () => {
		expect(isReviewFileAuthorized(review("someone"), "owner")).toBe(true);
	});

	it("grants a co-author and an assigned reviewer of the submission", () => {
		expect(isReviewFileAuthorized(review("someone"), "coauthor")).toBe(true);
		expect(isReviewFileAuthorized(review("someone"), "reviewer")).toBe(true);
	});

	it("denies an unrelated user", () => {
		expect(isReviewFileAuthorized(review("someone"), "stranger")).toBe(false);
	});
});
