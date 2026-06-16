import { createFileRoute } from "@tanstack/react-router";
import { bulkEmailCampaignsQueryOptions } from "@/features/bulk-email/api/bulk-email";
import { CampaignList } from "@/features/bulk-email/components/campaign-list";

export const Route = createFileRoute("/_app/admin/_layout/bulk-email/")({
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(bulkEmailCampaignsQueryOptions());
	},
	component: CampaignList,
});
