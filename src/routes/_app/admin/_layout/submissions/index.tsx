import { IconFileStack } from "@tabler/icons-react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { DataTable, DataTableToolbar } from "@/components/admin/data-table";
import { submissionColumns } from "@/components/admin/submissions/columns";
import { SubmissionBulkActions } from "@/components/admin/submissions/submission-bulk-actions";
import { SubmissionMobileCard } from "@/components/admin/submissions/submission-mobile-card";
import { PageHeader } from "@/components/layout/page-header";
import { adminSubmissionsQueryOptions } from "@/utils/admin-submissions.functions";

export const Route = createFileRoute("/_app/admin/_layout/submissions/")({
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(adminSubmissionsQueryOptions());
	},
	component: AdminSubmissionsPage,
});

const columnLabels: Record<string, string> = {
	title: "Title",
	type: "Type",
	status: "Status",
	ownerName: "Author",
	currentRound: "Round",
};

function AdminSubmissionsPage() {
	const queryClient = useQueryClient();
	const {
		data: { submissions },
	} = useSuspenseQuery(adminSubmissionsQueryOptions());

	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconFileStack} title="Submissions" />
			<div className="flex-1 overflow-auto p-6">
				<DataTable
					columns={submissionColumns}
					data={submissions}
					getRowId={(row) => row.id}
					mobileCard={SubmissionMobileCard}
					toolbar={(table) => (
						<DataTableToolbar
							table={table}
							searchKey="title"
							searchPlaceholder="Search submissions..."
							columnLabels={columnLabels}
							actions={
								<SubmissionBulkActions
									table={table}
									onSuccess={() =>
										queryClient.invalidateQueries({
											queryKey: adminSubmissionsQueryOptions().queryKey,
										})
									}
								/>
							}
						/>
					)}
				/>
			</div>
		</div>
	);
}
