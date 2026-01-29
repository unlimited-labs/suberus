import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AuthLayout } from "@/components/layout/auth-layout";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/_auth")({
	component: AuthLayoutRoute,
});

function AuthLayoutRoute() {
	const navigate = useNavigate();
	const { user, isPending } = useSession();

	useEffect(() => {
		if (!isPending && user) {
			navigate({ to: "/" });
		}
	}, [isPending, user, navigate]);

	if (isPending) {
		return (
			<div className="flex h-screen items-center justify-center">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
			</div>
		);
	}

	if (user) {
		return null;
	}

	return (
		<AuthLayout>
			<Outlet />
		</AuthLayout>
	);
}
