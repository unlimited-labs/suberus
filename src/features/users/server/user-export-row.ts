import { formatSurveyAnswerValue } from "@/features/survey/labels";
import { formatSubmissionRoles } from "@/features/users/labels";
import type { SurveyQuestionType } from "@/generated/prisma/enums";
import { neutralizeFormula } from "@/shared/server/spreadsheet-safe";
import type { AdminUser } from "./users";

export type ExportUser = Pick<
	AdminUser,
	| "firstName"
	| "lastName"
	| "email"
	| "title"
	| "affiliation"
	| "role"
	| "submissionRoles"
	| "isActive"
	| "fee"
	| "needInvoice"
	| "address"
	| "createdAt"
	| "lastLoginAt"
	| "surveyAnswers"
>;

export interface ExportQuestion {
	id: string;
	fieldName: string | null;
	label: string;
	type: SurveyQuestionType;
}

export type FormatExportDate = (date: Date | null | undefined) => string;

function buildSurveyColumns(
	surveyAnswers: ExportUser["surveyAnswers"],
	questions: ExportQuestion[],
): Record<string, string> {
	const answerByQuestion = new Map(
		surveyAnswers.map((a) => [a.questionId, a.value]),
	);
	const columns: Record<string, string> = {};
	for (const q of questions) {
		columns[q.fieldName ?? q.label] = neutralizeFormula(
			formatSurveyAnswerValue(q.type, answerByQuestion.get(q.id) ?? ""),
		);
	}
	// oxlint-disable-next-line anti-slop/no-known-value-widening -- survey questions name these columns at runtime
	return columns;
}

export function buildUserExportRow(
	user: ExportUser,
	questions: ExportQuestion[],
	fmtDate: FormatExportDate,
) {
	return {
		"First Name": neutralizeFormula(user.firstName ?? ""),
		"Last Name": neutralizeFormula(user.lastName ?? ""),
		Email: neutralizeFormula(user.email),
		Title: neutralizeFormula(user.title ?? ""),
		Affiliation: neutralizeFormula(user.affiliation ?? ""),
		Role: user.role,
		Submissions: formatSubmissionRoles(user.submissionRoles),
		Status: user.isActive ? "Active" : "Inactive",
		"Fee Status": user.fee?.paid ? "Paid" : "Unpaid",
		"Fee Type": user.fee?.type ?? "",
		"Fee Paid At": fmtDate(user.fee?.paidAt),
		"Need Invoice": user.needInvoice ? "True" : "False",
		"Invoice details": neutralizeFormula(user.address ?? ""),
		"Registration Date": fmtDate(user.createdAt),
		"Last Login": fmtDate(user.lastLoginAt),
		...buildSurveyColumns(user.surveyAnswers, questions),
	};
}
