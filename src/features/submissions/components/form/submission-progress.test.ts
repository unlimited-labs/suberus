import { describe, expect, it } from "vitest";
import type {
	SubmissionFormData,
	ValidationSettings,
} from "./submission-form-types";
import { computeSubmissionProgress } from "./submission-progress";

const settings: ValidationSettings = {
	minTitleLength: 10,
	maxTitleLength: 200,
	minAbstractLength: 500,
	maxAbstractLength: 2000,
	minKeywords: 3,
	maxKeywords: 5,
	enableKeywords: true,
};

const author = {
	firstName: "Ada",
	lastName: "Lovelace",
	email: "ada@example.com",
	affiliationId: null,
	affiliationName: "Analytical Engine Ltd",
	isPresenter: true,
};

const values = (
	overrides: Partial<SubmissionFormData> = {},
): SubmissionFormData => ({
	type: "ABSTRACT",
	title: "A long enough title",
	content: "x".repeat(500),
	acknowledgment: "",
	authors: [author],
	keywords: ["a", "b", "c"],
	file: null,
	contentFormat: "TEXT",
	trackId: null,
	...overrides,
});

describe("computeSubmissionProgress (TEXT format)", () => {
	it("marks everything complete for a full TEXT submission", () => {
		expect(computeSubmissionProgress(values(), settings, false)).toEqual({
			hasType: true,
			hasContent: true,
			hasAuthors: true,
			hasKeywords: true,
		});
	});

	it("hasContent false when title or abstract too short", () => {
		expect(
			computeSubmissionProgress(values({ title: "short" }), settings, false)
				.hasContent,
		).toBe(false);
		expect(
			computeSubmissionProgress(values({ content: "short" }), settings, false)
				.hasContent,
		).toBe(false);
	});
});

describe("computeSubmissionProgress (FILE format)", () => {
	it("hasContent tracks the uploaded file, not text length", () => {
		const file = new File(["x"], "doc.pdf");
		expect(
			computeSubmissionProgress(
				values({ title: "", content: "", file }),
				settings,
				true,
			).hasContent,
		).toBe(true);
		expect(
			computeSubmissionProgress(values({ file: null }), settings, true)
				.hasContent,
		).toBe(false);
	});
});

describe("computeSubmissionProgress (authors & keywords)", () => {
	it("hasAuthors false when an author misses a required field", () => {
		expect(
			computeSubmissionProgress(
				values({ authors: [{ ...author, affiliationName: "" }] }),
				settings,
				false,
			).hasAuthors,
		).toBe(false);
		expect(
			computeSubmissionProgress(values({ authors: [] }), settings, false)
				.hasAuthors,
		).toBe(false);
	});

	it("hasKeywords requires minKeywords when enabled", () => {
		expect(
			computeSubmissionProgress(values({ keywords: ["a"] }), settings, false)
				.hasKeywords,
		).toBe(false);
	});

	it("hasKeywords always true when keywords disabled", () => {
		expect(
			computeSubmissionProgress(
				values({ keywords: [] }),
				{ ...settings, enableKeywords: false },
				false,
			).hasKeywords,
		).toBe(true);
	});
});
