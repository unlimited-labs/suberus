import { createFileRoute } from "@tanstack/react-router"
import type { UserRole, FeeType } from "@/generated/prisma"
import { bulkMarkFeesPaid, bulkChangeRole } from "@/lib/server/admin/users"

interface BulkRequestBody {
	action: "mark_fee" | "change_role"
	userIds: string[]
	feeType?: FeeType
	role?: UserRole
}

export const Route = createFileRoute("/api/admin/users/bulk")({
	server: {
		handlers: {
			POST: async ({ request }: { request: Request }) => {
				const body = (await request.json()) as BulkRequestBody

				if (!body.userIds || body.userIds.length === 0) {
					return new Response(
						JSON.stringify({ error: "No users selected" }),
						{
							status: 400,
							headers: { "Content-Type": "application/json" },
						}
					)
				}

				if (body.action === "mark_fee") {
					if (!body.feeType) {
						return new Response(
							JSON.stringify({ error: "Fee type is required" }),
							{
								status: 400,
								headers: { "Content-Type": "application/json" },
							}
						)
					}

					const result = await bulkMarkFeesPaid({
						userIds: body.userIds,
						feeType: body.feeType,
					})

					return new Response(JSON.stringify(result), {
						headers: { "Content-Type": "application/json" },
					})
				}

				if (body.action === "change_role") {
					if (!body.role) {
						return new Response(
							JSON.stringify({ error: "Role is required" }),
							{
								status: 400,
								headers: { "Content-Type": "application/json" },
							}
						)
					}

					const result = await bulkChangeRole({
						userIds: body.userIds,
						role: body.role,
					})

					return new Response(JSON.stringify(result), {
						headers: { "Content-Type": "application/json" },
					})
				}

				return new Response(
					JSON.stringify({ error: "Invalid action" }),
					{
						status: 400,
						headers: { "Content-Type": "application/json" },
					}
				)
			},
		},
	},
})
