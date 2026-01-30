import { IconArrowLeft, IconUsers } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { UserDetailCard } from "@/components/admin/users/user-detail-card";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import type { AdminUser } from "@/lib/server/admin/users";
import { getAdminUserById } from "@/utils/admin-users.functions";

export const Route = createFileRoute("/_app/admin/_layout/users/$id")({
	component: UserDetailPage,
});

async function fetchUser(id: string): Promise<AdminUser | null> {
	try {
		return await getAdminUserById({ data: { id } });
	} catch (error) {
		if (error instanceof Response && error.status === 404) {
			return null;
		}
		throw error;
	}
}

function UserDetailPage() {
	const { id } = Route.useParams();

	const {
		data: user,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["admin-user", id],
		queryFn: () => fetchUser(id),
	});

	if (isLoading) {
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
				<div className="flex flex-1 items-center justify-center">
					<p className="text-muted-foreground">Loading...</p>
				</div>
			</div>
		);
	}

	if (error) {
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
					<p className="text-destructive">Error loading user</p>
				</div>
			</div>
		);
	}

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
