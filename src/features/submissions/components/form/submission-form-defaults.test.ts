import { describe, expect, it } from "vitest";
import { buildSubmissionDefaultValues } from "./submission-form-defaults";
import type {
	ActiveSubmissionType,
	SubmissionFormData,
} from "./submission-form-types";

const config = (
	overrides: Partial<ActiveSubmissionType["config"]> = {},
): ActiveSubmissionType["config"] =>
	({ contentFormat: "FILE", ...overrides }) as ActiveSubmissionType["config"];

describe("buildSubmissionDefaultValues", () => {
	it("falls back to type defaults and an empty first author when no initial data", () => {
		const result = buildSubmissionDefaultValues(undefined, "POSTER", undefined);

		expect(result.type).toBe("POSTER");
		expect(result.title).toBe("");
		expect(result.content).toBe("");
		expect(result.contentFormat).toBe("TEXT");
		expect(result.keywords).toEqual([]);
		expect(result.file).toBeNull();
		expect(result.trackId).toBeNull();
		expect(result.authors).toEqual([
			{
				firstName: "",
				lastName: "",
				email: "",
				affiliationId: null,
				affiliationName: "",
				isPresenter: true,
			},
		]);
	});

	it("takes contentFormat from the default config when no initial data", () => {
		const result = buildSubmissionDefaultValues(
			undefined,
			"ABSTRACT",
			config({ contentFormat: "FILE" }),
		);

		expect(result.contentFormat).toBe("FILE");
	});

	it("prefers initialData over the defaults", () => {
		const initialData: Partial<SubmissionFormData> = {
			type: "FULL_PAPER",
			title: "Existing title",
			content: "Existing content",
			keywords: ["a", "b"],
			trackId: "track-1",
			authors: [
				{
					firstName: "Ada",
					lastName: "Lovelace",
					email: "ada@example.com",
					affiliationId: "aff-1",
					affiliationName: "Analytical Engine Ltd",
					isPresenter: true,
				},
			],
		};

		const result = buildSubmissionDefaultValues(
			initialData,
			"ABSTRACT",
			config({ contentFormat: "TEXT" }),
		);

		expect(result.type).toBe("FULL_PAPER");
		expect(result.title).toBe("Existing title");
		expect(result.content).toBe("Existing content");
		expect(result.keywords).toEqual(["a", "b"]);
		expect(result.trackId).toBe("track-1");
		expect(result.authors).toEqual(initialData.authors);
	});

	it("derives contentFormat from the type config, ignoring initialData.contentFormat", () => {
		const result = buildSubmissionDefaultValues(
			{ contentFormat: "FILE" },
			"ABSTRACT",
			config({ contentFormat: "TEXT" }),
		);

		expect(result.contentFormat).toBe("TEXT");
	});
});
