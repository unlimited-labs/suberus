import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { getSetting } from "@/features/settings/server/settings";
import { formatSurveyAnswerValue } from "@/features/survey/labels";
import { getSurveyQuestions } from "@/features/survey/server/survey";
import { formatSubmissionRoles } from "@/features/users/labels";
import { getUsers } from "@/features/users/server/users";
import type { UserRole } from "@/generated/prisma/enums";
import { formatDateTime } from "@/shared/lib/format-date";
import { adminRequestMiddleware } from "@/shared/server/middleware/auth";
import { neutralizeFormula } from "@/shared/server/spreadsheet-safe";

export const Route = createFileRoute("/api/admin/users/export")({
	server: {
		middleware: [adminRequestMiddleware],
		handlers: {
			GET: async ({ request }) => {
				const url = new URL(request.url);
				const search = url.searchParams.get("search") ?? undefined;
				const roleParam = url.searchParams.get("role");
				const feePaidParam = url.searchParams.get("feePaid");

				const role = roleParam
					? (roleParam.split(",") as UserRole[])
					: undefined;

				const feePaid =
					feePaidParam === "true"
						? true
						: feePaidParam === "false"
							? false
							: undefined;

				const [{ users }, questions, dateFormat, timeFormat] =
					await Promise.all([
						getUsers({ search, role, feePaid }),
						getSurveyQuestions(),
						getSetting("DATE_FORMAT"),
						getSetting("TIME_FORMAT"),
					]);

				const fmtDate = (date: Date | null | undefined) =>
					date ? formatDateTime(date, dateFormat, timeFormat) : "";

				const rows = users.map((u) => {
					const answerByQuestion = new Map(
						u.surveyAnswers.map((a) => [a.questionId, a.value]),
					);
					const surveyColumns: Record<string, string> = {};
					for (const q of questions) {
						surveyColumns[q.fieldName ?? q.label] = neutralizeFormula(
							formatSurveyAnswerValue(q.type, answerByQuestion.get(q.id) ?? ""),
						);
					}

					return {
						"First Name": neutralizeFormula(u.firstName ?? ""),
						"Last Name": neutralizeFormula(u.lastName ?? ""),
						Email: neutralizeFormula(u.email),
						Title: neutralizeFormula(u.title ?? ""),
						Affiliation: neutralizeFormula(u.affiliation ?? ""),
						Role: u.role,
						Submissions: formatSubmissionRoles(u.submissionRoles),
						Status: u.isActive ? "Active" : "Inactive",
						"Fee Status": u.fee?.paid ? "Paid" : "Unpaid",
						"Fee Type": u.fee?.type ?? "",
						"Fee Paid At": fmtDate(u.fee?.paidAt),
						"Need Invoice": u.needInvoice ? "True" : "False",
						"Invoice details": neutralizeFormula(u.address ?? ""),
						"Registration Date": fmtDate(u.createdAt),
						"Last Login": fmtDate(u.lastLoginAt),
						...surveyColumns,
					};
				});

				const ws = XLSX.utils.json_to_sheet(rows);
				const wb = XLSX.utils.book_new();
				XLSX.utils.book_append_sheet(wb, ws, "Users");
				const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

				const filename = `users-export-${format(new Date(), "yyyy-MM-dd")}.xlsx`;

				return new Response(buffer, {
					headers: {
						"Content-Type":
							"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
						"Content-Disposition": `attachment; filename="${filename}"`,
					},
				});
			},
		},
	},
});
