import { IconShieldOff } from "@tabler/icons-react";
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

	return <Outlet />;
}
