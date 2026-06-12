import { IconAlertTriangle, IconBuildingStore } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ExhibitorApplicationForm } from "@/components/exhibitor/exhibitor-application-form";
import { ExhibitorStatusCard } from "@/components/exhibitor/exhibitor-status-card";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useSession } from "@/hooks/use-session";
import { exhibitorRouteMiddleware } from "@/lib/server/middleware/auth";
import {
	exhibitorPanelConfigQueryOptions,
	myExhibitorQueryOptions,
} from "@/server-fns/exhibitors";

export const Route = createFileRoute("/_app/exhibitor/")({
	server: {
		middleware: [exhibitorRouteMiddleware],
	},
	loader: async ({ context }) => {
		await Promise.all([
			context.queryClient.ensureQueryData(myExhibitorQueryOptions()),
			context.queryClient.ensureQueryData(exhibitorPanelConfigQueryOptions()),
		]);
	},
	component: ExhibitorPage,
});

function ExhibitorPage() {
	const navigate = useNavigate();
	const { user, isPending } = useSession();
	const { data: exhibitor } = useSuspenseQuery(myExhibitorQueryOptions());
	const { data: config } = useSuspenseQuery(exhibitorPanelConfigQueryOptions());

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

			<div className="flex-1 overflow-auto p-4 sm:p-8">
				<div className="mx-auto max-w-3xl space-y-6">
					{exhibitor ? (
						<>
							<ExhibitorStatusCard
								status={exhibitor.status}
								appliedAt={exhibitor.appliedAt}
								decidedAt={exhibitor.decidedAt}
							/>
							<ExhibitorApplicationForm
								exhibitor={exhibitor}
								allowPresentation={config.allowPresentation}
							/>
						</>
					) : (
						<Alert variant="destructive">
							<IconAlertTriangle className="size-4" />
							<AlertTitle>Exhibitor profile not found</AlertTitle>
							<AlertDescription>
								We could not find your exhibitor profile. Please contact the
								organizer.
							</AlertDescription>
						</Alert>
					)}
				</div>
			</div>
		</div>
	);
}
