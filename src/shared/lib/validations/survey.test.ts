import { describe, expect, it } from "vitest";
import { surveyAnswerRequiredError, surveyQuestionFormSchema } from "./survey";

describe("surveyAnswerRequiredError", () => {
	it("returns undefined for non-required questions regardless of value", () => {
		expect(
			surveyAnswerRequiredError({ type: "TEXT", isRequired: false }, ""),
		).toBeUndefined();
	});

	it("never blocks a CHECKBOX (boolean answer always present)", () => {
		expect(
			surveyAnswerRequiredError(
				{ type: "CHECKBOX", isRequired: true },
				"false",
			),
		).toBeUndefined();
	});

	it("requires a non-empty value for TEXT / SINGLE_SELECT", () => {
		expect(
			surveyAnswerRequiredError({ type: "TEXT", isRequired: true }, "   "),
		).toBe("This field is required");
		expect(
			surveyAnswerRequiredError(
				{ type: "SINGLE_SELECT", isRequired: true },
				"A",
			),
		).toBeUndefined();
	});

	it("requires at least one selected option for MULTI_SELECT", () => {
		expect(
			surveyAnswerRequiredError(
				{ type: "MULTI_SELECT", isRequired: true },
				"[]",
			),
		).toBe("Please select at least one option");
		expect(
			surveyAnswerRequiredError(
				{ type: "MULTI_SELECT", isRequired: true },
				JSON.stringify(["A"]),
			),
		).toBeUndefined();
	});

	it("treats malformed MULTI_SELECT JSON as unanswered", () => {
		expect(
			surveyAnswerRequiredError(
				{ type: "MULTI_SELECT", isRequired: true },
				"not-json",
			),
		).toBe("Please select at least one option");
	});

	it("treats a SINGLE_SELECT 'Other' with no typed text as unanswered", () => {
		expect(
			surveyAnswerRequiredError(
				{ type: "SINGLE_SELECT", isRequired: true },
				"__other__:",
			),
		).toBe("This field is required");
		expect(
			surveyAnswerRequiredError(
				{ type: "SINGLE_SELECT", isRequired: true },
				"__other__:nuts",
			),
		).toBeUndefined();
	});

	it("ignores an empty MULTI_SELECT 'Other' entry", () => {
		expect(
			surveyAnswerRequiredError(
				{ type: "MULTI_SELECT", isRequired: true },
				JSON.stringify(["__other__:"]),
			),
		).toBe("Please select at least one option");
		expect(
			surveyAnswerRequiredError(
				{ type: "MULTI_SELECT", isRequired: true },
				JSON.stringify(["__other__:nuts"]),
			),
		).toBeUndefined();
	});
});

describe("surveyQuestionFormSchema", () => {
	const base = {
		label: "Dietary needs",
		type: "TEXT" as const,
		isRequired: false,
		options: [] as string[],
		allowOther: false,
		showInUsersList: false,
		fieldName: "",
	};

	it("accepts a valid text question", () => {
		expect(surveyQuestionFormSchema.safeParse(base).success).toBe(true);
	});

	it("rejects a blank label", () => {
		const result = surveyQuestionFormSchema.safeParse({ ...base, label: "  " });
		expect(result.success).toBe(false);
	});

	it("requires at least 2 non-empty options for select questions", () => {
		const result = surveyQuestionFormSchema.safeParse({
			...base,
			type: "SINGLE_SELECT",
			options: ["A", " "],
		});
		expect(result.success).toBe(false);
	});

	it("accepts a select question with 2 options", () => {
		const result = surveyQuestionFormSchema.safeParse({
			...base,
			type: "MULTI_SELECT",
			options: ["A", "B"],
		});
		expect(result.success).toBe(true);
	});

	it("requires a field name when shown in users list", () => {
		const result = surveyQuestionFormSchema.safeParse({
			...base,
			showInUsersList: true,
			fieldName: "",
		});
		expect(result.success).toBe(false);
	});
});
