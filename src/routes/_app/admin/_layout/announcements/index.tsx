import { createFileRoute } from "@tanstack/react-router";
import { announcementsQueryOptions } from "@/features/announcements/api/announcements";
import { AnnouncementList } from "@/features/announcements/components/announcement-list";

export const Route = createFileRoute("/_app/admin/_layout/announcements/")({
	staticData: { title: "Announcements" },
	loader: async ({ context }) => {
		await context.queryClient.query({
			...announcementsQueryOptions(),
			staleTime: "static",
		});
	},
	component: AnnouncementList,
});
