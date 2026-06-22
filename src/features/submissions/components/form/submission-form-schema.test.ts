import { describe, expect, it } from "vitest";
import {
	buildContentSchema,
	buildSubmissionFormSchema,
	substituteGuidelines,
} from "./submission-form-schema";
import type { ValidationSettings } from "./submission-form-types";

const settings: ValidationSettings = {
	minTitleLength: 10,
	maxTitleLength: 200,
	minAbstractLength: 500,
	maxAbstractLength: 2000,
	minKeywords: 3,
	maxKeywords: 5,
	enableKeywords: true,
};

const author = (overrides: Record<string, unknown> = {}) => ({
	firstName: "Ada",
	lastName: "Lovelace",
	email: "ada@example.com",
	affiliationId: null,
	affiliationName: "Analytical Engine Ltd",
	isPresenter: true,
	...overrides,
});

const base = {
	type: "ABSTRACT" as const,
	title: "A sufficiently long title",
	content: "",
	authors: [author()],
	keywords: [],
	file: null,
	contentFormat: "TEXT" as const,
	trackId: null,
};

describe("buildSubmissionFormSchema", () => {
	const schema = buildSubmissionFormSchema(settings);

	it("accepts a valid submission", () => {
		expect(schema.safeParse(base).success).toBe(true);
	});

	it("enforces title min/max from settings", () => {
		expect(schema.safeParse({ ...base, title: "short" }).success).toBe(false);
		expect(schema.safeParse({ ...base, title: "x".repeat(201) }).success).toBe(
			false,
		);
	});

	it("does not constrain content length (handled separately)", () => {
		expect(schema.safeParse({ ...base, content: "" }).success).toBe(true);
	});

	it("does not constrain keyword count", () => {
		expect(schema.safeParse({ ...base, keywords: [] }).success).toBe(true);
	});

	it("requires firstName, lastName, email and affiliationName for every author", () => {
		for (const field of ["firstName", "lastName", "email", "affiliationName"]) {
			const result = schema.safeParse({
				...base,
				authors: [author({ [field]: "" })],
			});
			expect(result.success, `empty ${field} should fail`).toBe(false);
		}
	});

	it("requires a file for FILE submissions", () => {
		const result = schema.safeParse({ ...base, contentFormat: "FILE" });
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues.some((i) => i.path[0] === "file")).toBe(true);
		}
	});

	it("accepts a FILE submission that has a file", () => {
		const file = new File(["data"], "paper.pdf", { type: "application/pdf" });
		expect(
			schema.safeParse({ ...base, contentFormat: "FILE", file }).success,
		).toBe(true);
	});

	it("relaxes the file requirement when one already exists (editing a FILE draft)", () => {
		const editSchema = buildSubmissionFormSchema(settings, true);
		expect(
			editSchema.safeParse({ ...base, contentFormat: "FILE" }).success,
		).toBe(true);
	});
});

describe("buildContentSchema", () => {
	const schema = buildContentSchema(settings);

	it("enforces abstract min length", () => {
		expect(schema.safeParse({ content: "too short" }).success).toBe(false);
		expect(schema.safeParse({ content: "x".repeat(500) }).success).toBe(true);
	});

	it("enforces abstract max length", () => {
		expect(schema.safeParse({ content: "x".repeat(2001) }).success).toBe(false);
	});
});

describe("substituteGuidelines", () => {
	it("replaces every placeholder with its setting value", () => {
		const text =
			"title {{minTitleLength}}-{{maxTitleLength}}, abstract {{minAbstractLength}}-{{maxAbstractLength}}, keywords {{minKeywords}}-{{maxKeywords}}";
		expect(substituteGuidelines(text, settings)).toBe(
			"title 10-200, abstract 500-2000, keywords 3-5",
		);
	});

	it("leaves text without placeholders unchanged", () => {
		expect(substituteGuidelines("no tokens here", settings)).toBe(
			"no tokens here",
		);
	});
});
