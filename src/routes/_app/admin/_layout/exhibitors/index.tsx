import { IconBuildingStore } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ExhibitorsTable } from "@/components/admin/exhibitors/exhibitors-table";
import { listExhibitorsQueryOptions } from "@/server-fns/exhibitors";
import { PageHeader } from "@/shared/components/layout/page-header";

export const Route = createFileRoute("/_app/admin/_layout/exhibitors/")({
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(listExhibitorsQueryOptions());
	},
	component: AdminExhibitorsPage,
});

function AdminExhibitorsPage() {
	const { data: exhibitors } = useSuspenseQuery(listExhibitorsQueryOptions());

	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconBuildingStore} title="Exhibitors" />
			<div className="flex-1 overflow-auto p-6">
				<ExhibitorsTable exhibitors={exhibitors} />
			</div>
		</div>
	);
}
