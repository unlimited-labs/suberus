import type { SurveyQuestionType } from "@/generated/prisma/enums";

/**
 * Validates a survey answer against the question's `isRequired` flag.
 * Returns an error message when a required question is unanswered, otherwise
 * `undefined`. Shared by the registration form and the profile survey section
 * so enforcement is identical in both places.
 *
 * "Answered" depends on the question type:
 * - TEXT / SINGLE_SELECT: a non-empty value.
 * - MULTI_SELECT: at least one option selected (value is a JSON array string).
 * - CHECKBOX: always satisfied — a checkbox carries a boolean answer
 *   ("true"/"false") at all times, so there is no "unanswered" state to block.
 */
export function surveyAnswerRequiredError(
	question: { type: SurveyQuestionType; isRequired: boolean },
	value: string,
): string | undefined {
	if (!question.isRequired) return undefined;

	switch (question.type) {
		case "CHECKBOX":
			return undefined;
		case "MULTI_SELECT":
			return parseSelected(value).length > 0
				? undefined
				: "Please select at least one option";
		default:
			return value.trim().length > 0 ? undefined : "This field is required";
	}
}

function parseSelected(value: string): string[] {
	try {
		const parsed = JSON.parse(value);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}
