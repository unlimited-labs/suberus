import { IconDownload, IconUsers } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { DataTable, DataTableToolbar } from "@/components/admin/data-table";
import {
	buildUserColumns,
	type SurveyListColumn,
} from "@/components/admin/users/columns";
import { UserBulkActions } from "@/components/admin/users/user-bulk-actions";
import { UserMobileCard } from "@/components/admin/users/user-mobile-card";
import { adminUsersQueryOptions } from "@/server-fns/admin/users";
import {
	feeCurrencyQueryOptions,
	feeTypesQueryOptions,
} from "@/server-fns/settings";
import { adminSurveyQuestionsQueryOptions } from "@/server-fns/settings/survey";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/ui/button";

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

const columnLabels: Record<string, string> = {
	name: "Name",
	role: "Role",
	affiliation: "Affiliation",
	feePaid: "Fee",
	submissions: "Submissions",
	isActive: "Status",
	createdAt: "Registration Date",
};

function UsersPage() {
	const { data: users } = useSuspenseQuery(adminUsersQueryOptions());
	const { data: surveyQuestions } = useSuspenseQuery(
		adminSurveyQuestionsQueryOptions(),
	);

	const surveyColumns = useMemo<SurveyListColumn[]>(
		() =>
			surveyQuestions
				.filter((q) => q.showInUsersList)
				.map((q) => ({
					id: q.id,
					header: q.fieldName ?? q.label,
					type: q.type,
					options: q.options ?? undefined,
				})),
		[surveyQuestions],
	);

	const columns = useMemo(
		() => buildUserColumns(surveyColumns),
		[surveyColumns],
	);

	const dynamicColumnLabels = useMemo(
		() => ({
			...columnLabels,
			...Object.fromEntries(
				surveyColumns.map((c) => [`survey-${c.id}`, c.header]),
			),
		}),
		[surveyColumns],
	);

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
					columns={columns}
					data={users}
					getRowId={(row) => row.id}
					rowDataTestId="user-row"
					storageKey="admin-users"
					mobileCard={(u) => (
						<UserMobileCard user={u} surveyColumns={surveyColumns} />
					)}
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
							columnLabels={dynamicColumnLabels}
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
