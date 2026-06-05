import { IconDownload, IconUsers } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { DataTable, DataTableToolbar } from "@/components/admin/data-table";
import { userColumns } from "@/components/admin/users/columns";
import { UserBulkActions } from "@/components/admin/users/user-bulk-actions";
import { UserMobileCard } from "@/components/admin/users/user-mobile-card";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { adminUsersQueryOptions } from "@/server-fns/admin/users";
import {
	feeCurrencyQueryOptions,
	feeTypesQueryOptions,
} from "@/server-fns/settings";

export const Route = createFileRoute("/_app/admin/_layout/users/")({
	loader: async ({ context }) => {
		await Promise.all([
			context.queryClient.ensureQueryData(adminUsersQueryOptions()),
			context.queryClient.ensureQueryData(feeTypesQueryOptions()),
			context.queryClient.ensureQueryData(feeCurrencyQueryOptions()),
		]);
	},
	component: UsersPage,
});

const columnLabels: Record<string, string> = {
	name: "Name",
	role: "Role",
	affiliation: "Affiliation",
	feePaid: "Fee",
	submissions: "Submissions",
	isActive: "Status",
};

function UsersPage() {
	const { data: users } = useSuspenseQuery(adminUsersQueryOptions());

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
				<DataTable
					columns={userColumns}
					data={users}
					getRowId={(row) => row.id}
					mobileCard={UserMobileCard}
					initialColumnVisibility={{
						submissionType: false,
						submissionRole: false,
						submissionDraft: false,
					}}
					toolbar={(table, rowSelection) => (
						<DataTableToolbar
							table={table}
							searchKey="name"
							searchPlaceholder="Search users..."
							columnLabels={columnLabels}
							actions={
								<UserBulkActions table={table} rowSelection={rowSelection} />
							}
						/>
					)}
				/>
			</div>
		</div>
	);
}
