import { describe, expect, it } from "vitest";
import {
	adminSubmissionEditInput,
	createDynamicSubmissionSchema,
	DEFAULT_VALIDATION_LIMITS,
	submissionUpdateInput,
} from "./validations";

const submission = (patch: Record<string, unknown> = {}) => ({
	type: "ABSTRACT",
	title: "A sufficiently long submission title",
	content: "x".repeat(600),
	authors: [
		{
			firstName: "Ada",
			lastName: "Lovelace",
			email: "ada@example.com",
			affiliationId: null,
			affiliationName: "Analytical Engine Co.",
			isPresenter: true,
		},
	],
	keywords: ["alpha", "beta", "gamma"],
	contentFormat: "TEXT",
	trackId: null,
	...patch,
});

// Guards the single source of truth for CreateSubmissionInput: the configured
// limits must reach the schema, not a second hardcoded copy of them.
describe("createDynamicSubmissionSchema", () => {
	it("accepts a submission that satisfies the configured limits", () => {
		const schema = createDynamicSubmissionSchema(DEFAULT_VALIDATION_LIMITS);
		expect(schema.safeParse(submission()).success).toBe(true);
	});

	it("enforces the configured title bounds, not a hardcoded pair", () => {
		const limits = { ...DEFAULT_VALIDATION_LIMITS, minTitleLength: 25 };
		const schema = createDynamicSubmissionSchema(limits);
		expect(
			schema.safeParse(submission({ title: "x".repeat(24) })).success,
		).toBe(false);
		expect(
			schema.safeParse(submission({ title: "x".repeat(25) })).success,
		).toBe(true);
	});

	it("enforces the configured abstract bounds for TEXT submissions", () => {
		const limits = { ...DEFAULT_VALIDATION_LIMITS, minAbstractLength: 700 };
		const schema = createDynamicSubmissionSchema(limits);
		expect(schema.safeParse(submission()).success).toBe(false);
		expect(
			schema.safeParse(submission({ content: "x".repeat(700) })).success,
		).toBe(true);
	});

	it("drops the keyword minimum when keywords are switched off", () => {
		const limits = { ...DEFAULT_VALIDATION_LIMITS, enableKeywords: false };
		const schema = createDynamicSubmissionSchema(limits);
		expect(schema.safeParse(submission({ keywords: [] })).success).toBe(true);
	});
});

describe("submissionUpdateInput", () => {
	const id = "11111111-2222-4333-8444-555555555555";

	// A title-only patch is the whole reason the schema is partial: requiring
	// authors here would make an omission wipe them.
	it("accepts a patch carrying nothing but a title", () => {
		expect(
			submissionUpdateInput.safeParse({ submissionId: id, title: "Fixed" })
				.success,
		).toBe(true);
	});

	it("still requires a submission id", () => {
		expect(submissionUpdateInput.safeParse({ title: "Fixed" }).success).toBe(
			false,
		);
		expect(
			submissionUpdateInput.safeParse({ submissionId: "42", title: "Fixed" })
				.success,
		).toBe(false);
	});

	// replaceSubmissionAuthors rebuilds the whole list, so these two are the
	// difference between a patch and a wiped author record.
	it("refuses an author list that is empty or has no single presenter", () => {
		const authors = [
			{
				firstName: "Ada",
				lastName: "Lovelace",
				email: "ada@example.com",
				affiliationId: null,
				affiliationName: "Somewhere",
				isPresenter: true,
			},
		];
		expect(
			submissionUpdateInput.safeParse({ submissionId: id, authors: [] })
				.success,
		).toBe(false);
		expect(
			submissionUpdateInput.safeParse({
				submissionId: id,
				authors: [authors[0], { ...authors[0], email: "b@example.com" }],
			}).success,
		).toBe(false);
		expect(
			submissionUpdateInput.safeParse({ submissionId: id, authors }).success,
		).toBe(true);
	});

	it("refuses a blank title rather than erasing the current one", () => {
		expect(
			submissionUpdateInput.safeParse({ submissionId: id, title: "" }).success,
		).toBe(false);
	});

	// Retyping a submission stays a UI operation: allowing it here would let an
	// EXHIBITOR placeholder be laundered into an ordinary submission.
	it("takes no type", () => {
		const parsed = submissionUpdateInput.parse({
			submissionId: id,
			title: "Fixed",
			type: "ABSTRACT",
		});
		expect(parsed).not.toHaveProperty("type");
	});

	it("takes no contentFormat — it follows from the type's configuration", () => {
		const parsed = submissionUpdateInput.parse({
			submissionId: id,
			title: "Fixed",
			contentFormat: "TEXT",
		});
		expect(parsed).not.toHaveProperty("contentFormat");
	});
});

describe("adminSubmissionEditInput", () => {
	const id = "11111111-2222-4333-8444-555555555555";
	const edit = (patch: Record<string, unknown> = {}) => ({
		submissionId: id,
		type: "ABSTRACT",
		title: "A title",
		content: "body",
		authors: [
			{
				firstName: "Ada",
				lastName: "Lovelace",
				email: "ada@example.com",
				affiliationId: null,
				affiliationName: "Analytical Engine Co.",
				isPresenter: true,
			},
		],
		keywords: [],
		contentFormat: "TEXT",
		trackId: null,
		...patch,
	});

	it("requires a title and a single presenter on a normal save", () => {
		expect(adminSubmissionEditInput.safeParse(edit()).success).toBe(true);
		expect(
			adminSubmissionEditInput.safeParse(edit({ title: " " })).success,
		).toBe(false);
		expect(
			adminSubmissionEditInput.safeParse(edit({ authors: [] })).success,
		).toBe(false);
	});

	it("accepts an incomplete draft save", () => {
		expect(
			adminSubmissionEditInput.safeParse(
				edit({ asDraft: true, title: "", authors: [] }),
			).success,
		).toBe(true);
	});
});
