import { IconArrowLeft, IconBuildingStore } from "@tabler/icons-react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
	exhibitorDetailQueryOptions,
	listExhibitorsQueryOptions,
} from "@/features/exhibitors/api/exhibitors";
import { DecideExhibitorDialog } from "@/features/exhibitors/components/admin/decide-exhibitor-dialog";
import { ExhibitorCompanyCard } from "@/features/exhibitors/components/admin/detail/exhibitor-company-card";
import { ExhibitorContactCard } from "@/features/exhibitors/components/admin/detail/exhibitor-contact-card";
import { ExhibitorDecisionCard } from "@/features/exhibitors/components/admin/detail/exhibitor-decision-card";
import { ExhibitorPresentationCard } from "@/features/exhibitors/components/admin/detail/exhibitor-presentation-card";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/ui/button";

export const Route = createFileRoute("/_app/admin/_layout/exhibitors/$id")({
	loader: async ({ params, context }) => {
		await context.queryClient.ensureQueryData(
			exhibitorDetailQueryOptions(params.id),
		);
	},
	component: ExhibitorDetailPage,
});

function BackButton() {
	return (
		<Link to="/admin/exhibitors">
			<Button size="sm" variant="outline">
				<IconArrowLeft className="mr-2 size-4" />
				Back
			</Button>
		</Link>
	);
}

function ExhibitorDetailPage() {
	const { id } = Route.useParams();
	const { data: exhibitor } = useSuspenseQuery(exhibitorDetailQueryOptions(id));
	const queryClient = useQueryClient();
	const [decision, setDecision] = useState<"APPROVED" | "REJECTED" | null>(
		null,
	);

	if (!exhibitor) {
		return (
			<div className="flex h-full flex-col">
				<PageHeader icon={IconBuildingStore} title="Exhibitor">
					<BackButton />
				</PageHeader>
				<div className="flex flex-1 items-center justify-center">
					<p className="text-muted-foreground">Exhibitor not found</p>
				</div>
			</div>
		);
	}

	const invalidateDetail = () => {
		void queryClient.invalidateQueries({
			queryKey: exhibitorDetailQueryOptions(id).queryKey,
		});
		void queryClient.invalidateQueries({
			queryKey: listExhibitorsQueryOptions().queryKey,
		});
	};

	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconBuildingStore} title="Exhibitor Details">
				<BackButton />
			</PageHeader>
			<div className="flex-1 overflow-auto p-6">
				<div className="mx-auto max-w-3xl space-y-6">
					<ExhibitorCompanyCard
						exhibitor={exhibitor}
						onPackageSaved={invalidateDetail}
					/>
					<ExhibitorContactCard user={exhibitor.user} />
					<ExhibitorPresentationCard submission={exhibitor.submission} />
					<ExhibitorDecisionCard
						exhibitor={exhibitor}
						onApprove={() => setDecision("APPROVED")}
						onReject={() => setDecision("REJECTED")}
					/>
				</div>
			</div>
			{decision && (
				<DecideExhibitorDialog
					companyName={exhibitor.companyName}
					decision={decision}
					exhibitorId={exhibitor.id}
					onDecided={() => {
						void queryClient.invalidateQueries({
							queryKey: listExhibitorsQueryOptions().queryKey,
						});
					}}
					onOpenChange={(open) => {
						if (!open) setDecision(null);
					}}
					open
				/>
			)}
		</div>
	);
}
