import { IconArrowLeft, IconUsers } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { UserDetailCard } from "@/components/admin/users/user-detail-card";
import { Button } from "@/components/ui/button";
import { adminUserDetailQueryOptions } from "@/server-fns/admin/users";
import {
	feeCurrencyQueryOptions,
	feeTypesQueryOptions,
} from "@/server-fns/settings";
import { adminSurveyQuestionsQueryOptions } from "@/server-fns/settings/survey";
import { PageHeader } from "@/shared/components/layout/page-header";

export const Route = createFileRoute("/_app/admin/_layout/users/$id")({
	loader: async ({ params, context }) => {
		await Promise.all([
			context.queryClient.ensureQueryData(
				adminUserDetailQueryOptions(params.id),
			),
			context.queryClient.ensureQueryData(feeTypesQueryOptions()),
			context.queryClient.ensureQueryData(feeCurrencyQueryOptions()),
			context.queryClient.ensureQueryData(adminSurveyQuestionsQueryOptions()),
		]);
	},
	component: UserDetailPage,
});

function UserDetailPage() {
	const { id } = Route.useParams();
	const { data: user } = useSuspenseQuery(adminUserDetailQueryOptions(id));

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
		<div className="flex h-full flex-col">
			<PageHeader icon={IconUsers} title="User Details">
				<Link to="/admin/users">
					<Button variant="outline" size="sm">
						<IconArrowLeft className="mr-2 size-4" />
						Back
					</Button>
				</Link>
			</PageHeader>
			<div className="flex-1 overflow-auto p-6">
				<div className="mx-auto max-w-3xl">
					<UserDetailCard user={user} />
				</div>
			</div>
		</div>
	);
}
