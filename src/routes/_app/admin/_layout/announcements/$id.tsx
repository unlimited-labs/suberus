import { createFileRoute } from "@tanstack/react-router";
import { announcementQueryOptions } from "@/features/announcements/api/announcements";
import { AnnouncementComposePage } from "@/features/announcements/components/compose-page";

export const Route = createFileRoute("/_app/admin/_layout/announcements/$id")({
	staticData: { title: "Announcement" },
	loader: async ({ params, context }) => {
		await context.queryClient.query({
			...announcementQueryOptions(params.id),
			staleTime: "static",
		});
	},
	component: AnnouncementComposeRoute,
});

function AnnouncementComposeRoute() {
	const { id } = Route.useParams();
	return <AnnouncementComposePage announcementId={id} key={id} />;
}
