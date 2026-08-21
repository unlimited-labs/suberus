import { IconDownload, IconUserPlus, IconUsers } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
	feeCurrencyQueryOptions,
	feeTypesQueryOptions,
} from "@/features/settings/api/settings";
import { adminSurveyQuestionsQueryOptions } from "@/features/survey/api/survey";
import { adminUsersQueryOptions } from "@/features/users/api/users";
import {
	buildUserColumns,
	type SurveyListColumn,
} from "@/features/users/components/columns";
import { UserBulkActions } from "@/features/users/components/user-bulk-actions";
import { UserCreateDialog } from "@/features/users/components/user-create-dialog";
import { UserMobileCard } from "@/features/users/components/user-mobile-card";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/ui/button";
import { DataTable, DataTableToolbar } from "@/shared/ui/data-table";

export const Route = createFileRoute("/_app/admin/_layout/users/")({
	loader: async ({ context }) => {
		await Promise.all([
			context.queryClient.ensureQueryData(adminUsersQueryOptions()),
			context.queryClient.ensureQueryData(feeTypesQueryOptions()),
			context.queryClient.ensureQueryData(feeCurrencyQueryOptions()),
			context.queryClient.ensureQueryData(adminSurveyQuestionsQueryOptions()),
		]);
	},
	component: UsersPage,
});

const columnLabels = {
	name: "Name",
	role: "Role",
	affiliation: "Affiliation",
	feePaid: "Fee",
	submissions: "Submissions",
	isActive: "Status",
	createdAt: "Registration Date",
} satisfies Record<string, string>;

function UsersPage() {
	const [createOpen, setCreateOpen] = useState(false);
	const { data: users } = useSuspenseQuery(adminUsersQueryOptions());
	const { data: surveyQuestions } = useSuspenseQuery(
		adminSurveyQuestionsQueryOptions(),
	);

	const surveyColumns: SurveyListColumn[] = surveyQuestions.flatMap((q) =>
		q.showInUsersList
			? [
					{
						id: q.id,
						header: q.fieldName ?? q.label,
						type: q.type,
						options: q.options ?? undefined,
					},
				]
			: [],
	);

	const columns = buildUserColumns(surveyColumns);

	const dynamicColumnLabels = {
		...columnLabels,
		...Object.fromEntries(
			surveyColumns.map((c) => [`survey-${c.id}`, c.header]),
		),
	};

	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconUsers} title="Users">
				<Button
					data-testid="add-user-button"
					onClick={() => setCreateOpen(true)}
					size="sm"
				>
					<IconUserPlus className="mr-2 size-4" />
					Add User
				</Button>
				<Button asChild size="sm" variant="outline">
					<Link target="_blank" to="/api/admin/users/export">
						<IconDownload className="mr-2 size-4" />
						Export XLSX
					</Link>
				</Button>
			</PageHeader>
			<div className="flex-1 overflow-auto p-6">
				<DataTable
					columns={columns}
					data={users}
					getRowId={(row) => row.id}
					initialColumnVisibility={{
						submissionType: false,
						submissionRole: false,
						submissionDraft: false,
					}}
					mobileCard={(u) => <UserMobileCard user={u} />}
					rowDataTestId="user-row"
					storageKey="admin-users"
					toolbar={(table, rowSelection) => (
						<DataTableToolbar
							actions={
								<UserBulkActions rowSelection={rowSelection} table={table} />
							}
							columnLabels={dynamicColumnLabels}
							searchKey="name"
							searchPlaceholder="Search users..."
							table={table}
						/>
					)}
				/>
			</div>
			<UserCreateDialog onOpenChange={setCreateOpen} open={createOpen} />
		</div>
	);
}
