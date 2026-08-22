import type { SurveyQuestionType } from "@/generated/prisma/enums";
import { isOtherValue, otherText } from "@/shared/lib/validations/survey";

export function parseMultiSelect(value: string): string[] {
	if (!value) return [];
	try {
		const parsed = JSON.parse(value);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

function formatOption(value: string): string {
	return isOtherValue(value) ? `Other: ${otherText(value)}` : value;
}

export function formatSurveyAnswerValue(
	type: SurveyQuestionType,
	value: string,
): string {
	switch (type) {
		case "CHECKBOX":
			return value === "true" ? "Yes" : "No";
		case "MULTI_SELECT":
			return parseMultiSelect(value).map(formatOption).join(", ");
		default:
			return formatOption(value);
	}
}
