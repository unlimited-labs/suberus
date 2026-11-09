import {
	BILLING_AUDIT_LABELS as LABELS,
	billingColumnsToForm,
} from "@/features/settings/billing-details-rules";
import { formatSurveyAnswerValue } from "@/features/survey/labels";
import {
	formatSubmissionRoles,
	vatIdStatusLabels,
} from "@/features/users/labels";
import type { SurveyQuestionType } from "@/generated/prisma/enums";
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
	| "billingText"
	| "billingOrganization"
	| "billingStreet"
	| "billingPostalCode"
	| "billingCity"
	| "vatId"
	| "vatIdCheck"
	| "country"
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
		columns[q.fieldName ?? q.label] = formatSurveyAnswerValue(
			q.type,
			answerByQuestion.get(q.id) ?? "",
		);
	}
	// oxlint-disable-next-line anti-slop/no-known-value-widening -- survey questions name these columns at runtime
	return columns;
}

function billingColumns(user: ExportUser) {
	const billing = billingColumnsToForm(user);
	return {
		"Need Invoice": user.needInvoice ? "True" : "False",
		"Billing details (text)": billing.billingText,
		[LABELS.billingOrganization]: billing.billingOrganization,
		[LABELS.billingStreet]: billing.billingStreet,
		[LABELS.billingPostalCode]: billing.billingPostalCode,
		[LABELS.billingCity]: billing.billingCity,
		[LABELS.country]: user.country ?? "",
		[LABELS.vatId]: billing.vatId,
	};
}

function vatIdCheckColumns(
	check: ExportUser["vatIdCheck"],
	fmtDate: FormatExportDate,
) {
	return {
		"VAT ID status": check ? vatIdStatusLabels[check.status] : "",
		"VAT ID checked at": fmtDate(check?.checkedAt),
		"Registry name": check?.registryName ?? "",
	};
}

export function buildUserExportRow(
	user: ExportUser,
	questions: ExportQuestion[],
	fmtDate: FormatExportDate,
) {
	return {
		"First Name": user.firstName ?? "",
		"Last Name": user.lastName ?? "",
		Email: user.email,
		Title: user.title ?? "",
		Affiliation: user.affiliation ?? "",
		Role: user.role,
		Submissions: formatSubmissionRoles(user.submissionRoles),
		Status: user.isActive ? "Active" : "Inactive",
		"Fee Status": user.fee?.paid ? "Paid" : "Unpaid",
		"Fee Type": user.fee?.type ?? "",
		"Fee Paid At": fmtDate(user.fee?.paidAt),
		...billingColumns(user),
		...vatIdCheckColumns(user.vatIdCheck, fmtDate),
		"Registration Date": fmtDate(user.createdAt),
		"Last Login": fmtDate(user.lastLoginAt),
		...buildSurveyColumns(user.surveyAnswers, questions),
	};
}
