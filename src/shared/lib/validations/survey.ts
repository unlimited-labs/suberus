import { z } from "zod";
import type { SurveyQuestionType } from "@/generated/prisma/enums";

/**
 * Shape + cross-field rules for the admin survey-question editor (add + edit).
 * Single source of truth for the form's validation, consumed via TanStack Form
 * in `useSurveyQuestionForm`. Business rules:
 * - label is required,
 * - select questions need at least 2 non-empty options,
 * - a field name is required when the question is shown in the users list.
 */
export const surveyQuestionFormSchema = z
	.object({
		label: z.string().trim().min(1, "Label is required"),
		type: z.enum(["CHECKBOX", "TEXT", "SINGLE_SELECT", "MULTI_SELECT"]),
		isRequired: z.boolean(),
		options: z.array(z.string()),
		allowOther: z.boolean(),
		showInUsersList: z.boolean(),
		fieldName: z.string(),
	})
	.superRefine((value, ctx) => {
		const isSelect =
			value.type === "SINGLE_SELECT" || value.type === "MULTI_SELECT";
		if (isSelect && value.options.filter((o) => o.trim()).length < 2) {
			ctx.addIssue({
				code: "custom",
				path: ["options"],
				message: "Select questions require at least 2 options",
			});
		}
		if (value.showInUsersList && !value.fieldName.trim()) {
			ctx.addIssue({
				code: "custom",
				path: ["fieldName"],
				message: "Field name is required to show in users list",
			});
		}
	});

export type SurveyQuestionFormValues = z.infer<typeof surveyQuestionFormSchema>;

/**
 * "Other" free-text answer codec for SINGLE_SELECT / MULTI_SELECT questions with
 * `allowOther`. The answer is stored in the normal value field, marked with a
 * reserved prefix so it is unambiguously distinguishable from preset options
 * (and from a real option that happens to share the text). `__other__:` empty
 * means "Other selected, nothing typed yet" — treated as unanswered.
 */
export const OTHER_PREFIX = "__other__:";
export const isOtherValue = (v: string) => v.startsWith(OTHER_PREFIX);
export const otherText = (v: string) => v.slice(OTHER_PREFIX.length);
export const makeOther = (text: string) => OTHER_PREFIX + text;

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
			return parseSelected(value).filter(isAnswered).length > 0
				? undefined
				: "Please select at least one option";
		default:
			return isAnswered(value) ? undefined : "This field is required";
	}
}

/** An "Other" entry with no typed text (`__other__:`) does not count as answered. */
function isAnswered(value: string): boolean {
	const text = isOtherValue(value) ? otherText(value) : value;
	return text.trim().length > 0;
}

function parseSelected(value: string): string[] {
	try {
		const parsed = JSON.parse(value);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}
