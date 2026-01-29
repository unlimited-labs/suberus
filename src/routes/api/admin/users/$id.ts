import { createFileRoute } from "@tanstack/react-router";
import type { FeeType, UserRole } from "@/generated/prisma";
import {
	changeUserRole,
	getUserById,
	markFeePaid,
	toggleUserActive,
} from "@/lib/server/admin/users";

interface PatchBody {
	role?: UserRole;
	isActive?: boolean;
	markFeePaid?: boolean;
	feeType?: FeeType;
}

export const Route = createFileRoute("/api/admin/users/$id")({
	server: {
		handlers: {
			GET: async ({ params }: { params: { id: string } }) => {
				const user = await getUserById(params.id);

				if (!user) {
					return new Response(JSON.stringify({ error: "User not found" }), {
						status: 404,
						headers: { "Content-Type": "application/json" },
					});
				}

				return new Response(JSON.stringify(user), {
					headers: { "Content-Type": "application/json" },
				});
			},
			PATCH: async ({
				params,
				request,
			}: {
				params: { id: string };
				request: Request;
			}) => {
				const body = (await request.json()) as PatchBody;

				// Change role
				if (body.role !== undefined) {
					await changeUserRole({ userId: params.id, role: body.role });
				}

				// Toggle active
				if (body.isActive !== undefined) {
					await toggleUserActive({
						userId: params.id,
						isActive: body.isActive,
					});
				}

				// Mark fee paid
				if (body.markFeePaid && body.feeType) {
					await markFeePaid({ userId: params.id, feeType: body.feeType });
				}

				const user = await getUserById(params.id);

				return new Response(JSON.stringify(user), {
					headers: { "Content-Type": "application/json" },
				});
			},
		},
	},
});
