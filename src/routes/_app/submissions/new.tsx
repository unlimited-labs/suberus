import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { userDashboardQueryOptions } from "@/features/dashboard/api/user-dashboard";
import { mySubmissionsQueryOptions } from "@/features/submissions/api/submissions";
import {
	ensureSubmissionCreateData,
	SubmissionCreateView,
} from "@/features/submissions/components/form/submission-create-view";
import { activeTracksQueryOptions } from "@/features/tracks/api/tracks";

export const Route = createFileRoute("/_app/submissions/new")({
	loader: async ({ context }) => {
		await ensureSubmissionCreateData(context.queryClient);
	},
	component: NewSubmissionPage,
});

function NewSubmissionPage() {
	const { data: availableTracks = [] } = useQuery(activeTracksQueryOptions());
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const onCreated = async (createdId: string) => {
		await Promise.all([
			queryClient.invalidateQueries({
				queryKey: mySubmissionsQueryOptions().queryKey,
			}),
			queryClient.invalidateQueries({
				queryKey: userDashboardQueryOptions().queryKey,
			}),
		]);
		navigate({ to: "/submissions/$id", params: { id: createdId } });
	};

	return (
		<SubmissionCreateView
			mode="self"
			availableTracks={availableTracks}
			onCreated={onCreated}
		/>
	);
}
