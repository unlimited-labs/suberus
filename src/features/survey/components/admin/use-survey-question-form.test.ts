import { describe, expect, it } from "vitest";
import type { SurveyQuestion } from "./survey-question-fields";
import { toSurveyQuestionFormValues } from "./use-survey-question-form";

const question: SurveyQuestion = {
	id: "q1",
	label: "Diet",
	type: "SINGLE_SELECT",
	options: ["vegan", "vegetarian"],
	allowOther: true,
	isRequired: true,
	orderIndex: 0,
	isActive: true,
	showInUsersList: true,
	fieldName: "diet",
};

describe("toSurveyQuestionFormValues", () => {
	it("maps a persisted question to form values", () => {
		expect(toSurveyQuestionFormValues(question)).toEqual({
			label: "Diet",
			type: "SINGLE_SELECT",
			isRequired: true,
			options: ["vegan", "vegetarian"],
			allowOther: true,
			showInUsersList: true,
			fieldName: "diet",
		});
	});

	it("returns add-mode defaults for null/undefined", () => {
		const defaults = {
			label: "",
			type: "CHECKBOX",
			isRequired: false,
			options: [],
			allowOther: false,
			showInUsersList: false,
			fieldName: "",
		};
		expect(toSurveyQuestionFormValues(null)).toEqual(defaults);
		expect(toSurveyQuestionFormValues()).toEqual(defaults);
	});

	it("coerces a null options field to an empty array", () => {
		expect(
			toSurveyQuestionFormValues({ ...question, options: null }).options,
		).toEqual([]);
	});

	it("keeps a missing fieldName as an empty string", () => {
		expect(
			toSurveyQuestionFormValues({ ...question, fieldName: null }).fieldName,
		).toBe("");
	});
});
