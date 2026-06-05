import { IconShieldOff } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { adminRouteMiddleware } from "@/lib/server/middleware/auth";

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
			<div className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
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
		queryKey: ["build-version"],
		queryFn: async (): Promise<{ commit: string; builtAt: string }> => {
			const res = await fetch("/api/version");
			return res.json();
		},
		staleTime: Infinity,
	});

	if (!data) return null;

	const builtAt =
		data.builtAt === "unknown" ? "unknown" : data.builtAt.slice(0, 10);

	return (
		<footer className="px-4 py-2 text-center text-xs text-muted-foreground">
			build {data.commit} · {builtAt}
		</footer>
	);
}
