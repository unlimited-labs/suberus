import { describe, expect, it } from "vitest";
import {
	createDynamicSubmissionSchema,
	DEFAULT_VALIDATION_LIMITS,
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
