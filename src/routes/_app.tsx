import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/_app")({
	component: AppLayoutRoute,
});

function AppLayoutRoute() {
	const navigate = useNavigate();
	const { user, isPending } = useSession();

	useEffect(() => {
		if (!isPending && !user) {
			navigate({ to: "/login" });
		}
	}, [isPending, user, navigate]);

	if (isPending) {
		return (
			<div className="flex h-screen items-center justify-center">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
			</div>
		);
	}

	if (!user) {
		return null;
	}

	return (
		<AppLayout>
			<Outlet />
		</AppLayout>
	);
}
