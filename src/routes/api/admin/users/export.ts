import { createFileRoute } from "@tanstack/react-router";
import * as XLSX from "xlsx";
import type { UserRole } from "@/generated/prisma/enums";
import { formatDateTime } from "@/lib/format-date";
import { getUsers } from "@/lib/server/admin/users";
import { adminRequestMiddleware } from "@/lib/server/middleware/auth";
import { getSetting } from "@/lib/server/settings";

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

				const [{ users }, dateFormat, timeFormat] = await Promise.all([
					getUsers({ search, role, feePaid }),
					getSetting("DATE_FORMAT"),
					getSetting("TIME_FORMAT"),
				]);

				const fmtDate = (date: Date | null | undefined) =>
					date ? formatDateTime(date, dateFormat, timeFormat) : "";

				const rows = users.map((u) => ({
					"First Name": u.firstName ?? "",
					"Last Name": u.lastName ?? "",
					Email: u.email,
					Title: u.title ?? "",
					Affiliation: u.affiliation ?? "",
					Role: u.role,
					Status: u.isActive ? "Active" : "Inactive",
					"Fee Status": u.fee?.paid ? "Paid" : "Unpaid",
					"Fee Type": u.fee?.type ?? "",
					"Fee Paid At": fmtDate(u.fee?.paidAt),
					"Created At": fmtDate(u.createdAt),
					"Last Login": fmtDate(u.lastLoginAt),
				}));

				const ws = XLSX.utils.json_to_sheet(rows);
				const wb = XLSX.utils.book_new();
				XLSX.utils.book_append_sheet(wb, ws, "Users");
				const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

				const filename = `users-export-${new Date().toISOString().split("T")[0]}.xlsx`;

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
