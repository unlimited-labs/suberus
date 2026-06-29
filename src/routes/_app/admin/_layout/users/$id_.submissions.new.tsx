import { IconArrowLeft, IconUsers } from "@tabler/icons-react";
import {
	useQuery,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	ensureSubmissionCreateData,
	SubmissionCreateView,
} from "@/features/submissions/components/form/submission-create-view";
import { activeTracksQueryOptions } from "@/features/tracks/api/tracks";
import { adminUserDetailQueryOptions } from "@/features/users/api/users";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/ui/button";

export const Route = createFileRoute(
	"/_app/admin/_layout/users/$id_/submissions/new",
)({
	loader: async ({ params, context }) => {
		await Promise.all([
			ensureSubmissionCreateData(context.queryClient),
			context.queryClient.ensureQueryData(
				adminUserDetailQueryOptions(params.id),
			),
		]);
	},
	component: AdminCreateSubmissionPage,
});

function AdminCreateSubmissionPage() {
	const { id } = Route.useParams();
	const { data: user } = useSuspenseQuery(adminUserDetailQueryOptions(id));
	const { data: availableTracks = [] } = useQuery(activeTracksQueryOptions());
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const onCreated = async () => {
		await queryClient.invalidateQueries({
			queryKey: adminUserDetailQueryOptions(id).queryKey,
		});
		navigate({ to: "/admin/users/$id", params: { id } });
	};

	if (!user) {
		return (
			<div className="flex h-full flex-col">
				<PageHeader icon={IconUsers} title="User">
					<Link to="/admin/users">
						<Button variant="outline" size="sm">
							<IconArrowLeft className="mr-2 size-4" />
							Back
						</Button>
					</Link>
				</PageHeader>
				<div className="flex flex-1 items-center justify-center">
					<p className="text-muted-foreground">User not found</p>
				</div>
			</div>
		);
	}

	return (
		<SubmissionCreateView
			mode="on-behalf"
			availableTracks={availableTracks}
			onCreated={onCreated}
			onBehalfUser={{
				id: user.id,
				firstName: user.firstName,
				lastName: user.lastName,
				email: user.email,
				affiliationId: user.affiliationId,
				affiliationName: user.affiliation,
			}}
		/>
	);
}
