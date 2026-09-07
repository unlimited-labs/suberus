import { createFileRoute } from "@tanstack/react-router";
import { announcementQueryOptions } from "@/features/announcements/api/announcements";
import { AnnouncementComposePage } from "@/features/announcements/components/compose-page";

export const Route = createFileRoute("/_app/admin/_layout/announcements/$id")({
	loader: async ({ params, context }) => {
		await context.queryClient.ensureQueryData(
			announcementQueryOptions(params.id),
		);
	},
	component: AnnouncementComposeRoute,
});

function AnnouncementComposeRoute() {
	const { id } = Route.useParams();
	return <AnnouncementComposePage announcementId={id} key={id} />;
}
