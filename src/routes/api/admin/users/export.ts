import { createFileRoute } from "@tanstack/react-router"
import * as XLSX from "xlsx"
import type { UserRole } from "@/generated/prisma"
import { getUsers } from "@/lib/server/admin/users"

function formatDate(date: Date | null | undefined): string {
	if (!date) return ""
	return new Intl.DateTimeFormat("en-US", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(date)
}

export const Route = createFileRoute("/api/admin/users/export")({
	server: {
		handlers: {
			GET: async ({ request }: { request: Request }) => {
				const url = new URL(request.url)
				const search = url.searchParams.get("search") ?? undefined
				const roleParam = url.searchParams.get("role")
				const feePaidParam = url.searchParams.get("feePaid")

				const role = roleParam
					? (roleParam.split(",") as UserRole[])
					: undefined

				const feePaid =
					feePaidParam === "true"
						? true
						: feePaidParam === "false"
							? false
							: undefined

				const { users } = await getUsers({ search, role, feePaid })

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
					"Fee Paid At": formatDate(u.fee?.paidAt),
					"Created At": formatDate(u.createdAt),
					"Last Login": formatDate(u.lastLoginAt),
				}))

				const ws = XLSX.utils.json_to_sheet(rows)
				const wb = XLSX.utils.book_new()
				XLSX.utils.book_append_sheet(wb, ws, "Users")
				const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })

				const filename = `users-export-${new Date().toISOString().split("T")[0]}.xlsx`

				return new Response(buffer, {
					headers: {
						"Content-Type":
							"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
						"Content-Disposition": `attachment; filename="${filename}"`,
					},
				})
			},
		},
	},
})
