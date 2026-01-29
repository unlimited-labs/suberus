import { createFileRoute } from "@tanstack/react-router";
import type { UserRole } from "@/generated/prisma";
import { getUsers } from "@/lib/server/admin/users";

export const Route = createFileRoute("/api/admin/users/")({
	server: {
		handlers: {
			GET: async ({ request }: { request: Request }) => {
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

				const result = await getUsers({ search, role, feePaid });

				return new Response(JSON.stringify(result), {
					headers: { "Content-Type": "application/json" },
				});
			},
		},
	},
});
