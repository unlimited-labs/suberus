import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { adminRequestMiddleware } from "@/features/auth/server/middleware";
import { grossAmount, netAmount } from "@/features/finances/calc";
import {
	getFeeSummary,
	listFinanceEntries,
} from "@/features/finances/server/finances";
import { neutralizeFormula } from "@/shared/server/spreadsheet-safe";

const round2 = (n: number) => Math.round(n * 100) / 100;

export const Route = createFileRoute("/api/admin/finances/export")({
	server: {
		middleware: [adminRequestMiddleware],
		handlers: {
			GET: async () => {
				const [entries, feeSummary] = await Promise.all([
					listFinanceEntries(),
					getFeeSummary(),
				]);

				const income = entries.filter((e) => e.kind === "INCOME");
				const expenses = entries.filter((e) => e.kind === "EXPENSE");
				const totalIncome =
					feeSummary.collectedTotal +
					income.reduce((sum, e) => sum + e.amount, 0);
				const totalExpenses = expenses.reduce(
					(sum, e) => sum + grossAmount(e),
					0,
				);
				const currency = feeSummary.currency;

				const line = (
					type: string,
					item: string,
					contractor: string,
					net: number,
					vatRate: number | null,
					gross: number,
					ordered: string | boolean = "",
					paid: string | boolean = "",
					due: string = "",
				) => ({
					Type: type,
					Item: neutralizeFormula(item),
					Contractor: neutralizeFormula(contractor),
					Net: round2(net),
					"VAT %": vatRate ?? "",
					VAT: round2(gross - net),
					Gross: round2(gross),
					Ordered: ordered === true ? "yes" : ordered === false ? "no" : "",
					Paid: paid === true ? "yes" : paid === false ? "no" : "",
					Due: due,
					Currency: currency,
				});
				const blank = {
					Type: "",
					Item: "",
					Contractor: "",
					Net: "",
					"VAT %": "",
					VAT: "",
					Gross: "",
					Ordered: "",
					Paid: "",
					Due: "",
					Currency: "",
				};

				const rows: Array<Record<string, number | string>> = [
					line(
						"Income",
						"Registration fees",
						"",
						feeSummary.collectedTotal,
						null,
						feeSummary.collectedTotal,
					),
					...income.map((e) =>
						line("Income", e.label, "", e.amount, null, e.amount),
					),
					...expenses.map((e) =>
						line(
							"Expense",
							e.label,
							e.contractor ?? "",
							netAmount(e),
							e.vatRate,
							grossAmount(e),
							e.ordered,
							e.paid,
							e.dueDate,
						),
					),
					blank,
					line("Total", "Income", "", totalIncome, null, totalIncome),
					{
						...blank,
						Type: "Total",
						Item: "Expenses",
						Gross: round2(totalExpenses),
					},
					{
						...blank,
						Type: "Total",
						Item: "Net",
						Gross: round2(totalIncome - totalExpenses),
					},
				];

				const ws = XLSX.utils.json_to_sheet(rows);
				const wb = XLSX.utils.book_new();
				XLSX.utils.book_append_sheet(wb, ws, "Finances");
				const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

				const filename = `finances-export-${format(new Date(), "yyyy-MM-dd")}.xlsx`;

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
