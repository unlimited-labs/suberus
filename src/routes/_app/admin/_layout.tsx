import { IconShieldOff } from "@tabler/icons-react";
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAdminAuth } from "@/hooks/use-admin-auth";

export const Route = createFileRoute("/_app/admin/_layout")({
	component: AdminLayout,
});

function AdminLayout() {
	const { isAdmin } = useAdminAuth();
	const navigate = useNavigate();

	useEffect(() => {
		if (!isAdmin) {
			navigate({ to: "/" });
		}
	}, [isAdmin, navigate]);

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
