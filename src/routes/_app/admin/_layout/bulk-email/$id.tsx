import { createFileRoute } from "@tanstack/react-router";
import { bulkEmailCampaignQueryOptions } from "@/features/bulk-email/api/bulk-email";
import { ComposePage } from "@/features/bulk-email/components/compose-page";

export const Route = createFileRoute("/_app/admin/_layout/bulk-email/$id")({
	loader: async ({ params, context }) => {
		await context.queryClient.ensureQueryData(
			bulkEmailCampaignQueryOptions(params.id),
		);
	},
	component: BulkEmailComposeRoute,
});

function BulkEmailComposeRoute() {
	const { id } = Route.useParams();
	return <ComposePage key={id} campaignId={id} />;
}
