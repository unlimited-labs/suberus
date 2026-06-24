import type { SurveyQuestionType } from "@/generated/prisma/enums";
import { isOtherValue, otherText } from "@/shared/lib/validations/survey";

/** Parse a MULTI_SELECT stored value (JSON array string) into options. */
export function parseMultiSelect(value: string): string[] {
	if (!value) return [];
	try {
		const parsed = JSON.parse(value);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

/** Render a single stored option, unwrapping an "Other" free-text entry. */
function formatOption(value: string): string {
	return isOtherValue(value) ? `Other: ${otherText(value)}` : value;
}

/** Human-readable survey answer value for lists, detail panel and XLSX export. */
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
