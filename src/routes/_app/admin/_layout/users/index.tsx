import { IconDownload, IconUsers } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { DataTable, DataTableToolbar } from "@/components/admin/data-table";
import { userColumns } from "@/components/admin/users/columns";
import { UserBulkActions } from "@/components/admin/users/user-bulk-actions";
import { UserMobileCard } from "@/components/admin/users/user-mobile-card";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import type { AdminUser, GetUsersResponse } from "@/lib/server/admin/users";

export const Route = createFileRoute("/_app/admin/_layout/users/")({
	component: UsersPage,
});

const columnLabels: Record<string, string> = {
	name: "Name",
	role: "Role",
	affiliation: "Affiliation",
	feePaid: "Fee",
	isActive: "Status",
};

async function fetchUsers(): Promise<AdminUser[]> {
	const response = await fetch("/api/admin/users");
	if (!response.ok) {
		throw new Error("Failed to fetch users");
	}
	const data: GetUsersResponse = await response.json();
	return data.users;
}

function UsersPage() {
	const {
		data: users = [],
		isLoading,
		error,
	} = useQuery({
		queryKey: ["admin-users"],
		queryFn: fetchUsers,
	});

	if (error) {
		return (
			<div className="flex h-full flex-col">
				<PageHeader icon={IconUsers} title="Users" />
				<div className="flex flex-1 items-center justify-center">
					<p className="text-destructive">Error loading users</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconUsers} title="Users">
				<Button variant="outline" size="sm" asChild>
					<Link to="/api/admin/users/export" target="_blank">
						<IconDownload className="mr-2 size-4" />
						Export XLSX
					</Link>
				</Button>
			</PageHeader>
			<div className="flex-1 overflow-auto p-6">
				{isLoading ? (
					<div className="flex h-32 items-center justify-center">
						<p className="text-muted-foreground">Loading...</p>
					</div>
				) : (
					<DataTable
						columns={userColumns}
						data={users}
						getRowId={(row) => row.id}
						mobileCard={UserMobileCard}
						toolbar={(table) => (
							<DataTableToolbar
								table={table}
								searchKey="name"
								searchPlaceholder="Search users..."
								columnLabels={columnLabels}
								actions={<UserBulkActions table={table} />}
							/>
						)}
					/>
				)}
			</div>
		</div>
	);
}
