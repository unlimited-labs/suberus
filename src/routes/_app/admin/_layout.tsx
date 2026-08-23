import { IconShieldOff } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { adminRouteMiddleware } from "@/features/auth/server/middleware";
import { useAdminAuth } from "@/shared/hooks/use-admin-auth";
import { buildVersionQueryOptions } from "@/shared/lib/version-skew";

export const Route = createFileRoute("/_app/admin/_layout")({
	server: {
		middleware: [adminRouteMiddleware],
	},
	component: AdminLayout,
});

function AdminLayout() {
	const { isAdmin } = useAdminAuth();

	if (!isAdmin) {
		return (
			<div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-4">
				<IconShieldOff className="size-16" />
				<p>You don't have permission to access this section</p>
			</div>
		);
	}

	return (
		<div className="flex h-full flex-col">
			<div className="flex-1">
				<Outlet />
			</div>
			<BuildFooter />
		</div>
	);
}

function BuildFooter() {
	const { data } = useQuery({
		...buildVersionQueryOptions(),
		staleTime: Number.POSITIVE_INFINITY,
	});

	if (!data) return null;

	const builtAt =
		data.builtAt === "unknown" ? "unknown" : data.builtAt.slice(0, 10);

	return (
		<footer className="text-muted-foreground px-4 py-2 text-center text-xs">
			build {data.commit.slice(0, 7)} · {builtAt}
		</footer>
	);
}
