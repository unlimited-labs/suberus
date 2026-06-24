import { describe, expect, it } from "vitest";
import { formatSurveyAnswerValue } from "./labels";

describe("formatSurveyAnswerValue", () => {
	it("renders CHECKBOX as Yes/No", () => {
		expect(formatSurveyAnswerValue("CHECKBOX", "true")).toBe("Yes");
		expect(formatSurveyAnswerValue("CHECKBOX", "false")).toBe("No");
	});

	it("joins MULTI_SELECT options", () => {
		expect(
			formatSurveyAnswerValue("MULTI_SELECT", JSON.stringify(["A", "B"])),
		).toBe("A, B");
	});

	it("prefixes an 'Other' free-text answer", () => {
		expect(formatSurveyAnswerValue("SINGLE_SELECT", "__other__:nuts")).toBe(
			"Other: nuts",
		);
		expect(
			formatSurveyAnswerValue(
				"MULTI_SELECT",
				JSON.stringify(["Vege", "__other__:nuts"]),
			),
		).toBe("Vege, Other: nuts");
	});
});
