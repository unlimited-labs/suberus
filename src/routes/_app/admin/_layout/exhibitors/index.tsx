import { IconBuildingStore } from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/page-header";

export const Route = createFileRoute("/_app/admin/_layout/exhibitors/")({
	component: AdminExhibitorsPage,
});

function AdminExhibitorsPage() {
	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconBuildingStore} title="Exhibitors" />
		</div>
	);
}
