import { IconBuildingStore } from "@tabler/icons-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { useSession } from "@/hooks/use-session";
import { exhibitorRouteMiddleware } from "@/lib/server/middleware/auth";

export const Route = createFileRoute("/_app/exhibitor/")({
	server: {
		middleware: [exhibitorRouteMiddleware],
	},
	component: ExhibitorPage,
});

function ExhibitorPage() {
	const navigate = useNavigate();
	const { user, isPending } = useSession();

	// Client-side guard for SPA navigations (server middleware covers full loads)
	useEffect(() => {
		if (!isPending && user && user.role !== "EXHIBITOR") {
			navigate({ to: "/" });
		}
	}, [isPending, user, navigate]);

	if (user?.role !== "EXHIBITOR") {
		return null;
	}

	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconBuildingStore} title="Exhibitor Panel" />
		</div>
	);
}
