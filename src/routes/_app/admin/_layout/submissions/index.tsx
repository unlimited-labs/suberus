import { IconFileStack } from "@tabler/icons-react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { DataTable, DataTableToolbar } from "@/components/admin/data-table";
import { PageHeader } from "@/components/layout/page-header";
import { adminSubmissionsQueryOptions } from "@/features/submissions/api/admin-submissions";
import { submissionColumns } from "@/features/submissions/components/admin/columns";
import { SubmissionExportButton } from "@/features/submissions/components/admin/export-button";
import { SubmissionBulkActions } from "@/features/submissions/components/admin/submission-bulk-actions";
import { SubmissionMobileCard } from "@/features/submissions/components/admin/submission-mobile-card";

export const Route = createFileRoute("/_app/admin/_layout/submissions/")({
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(adminSubmissionsQueryOptions());
	},
	component: AdminSubmissionsPage,
});

const columnLabels: Record<string, string> = {
	sequentialNumber: "Sequential number",
	title: "Title",
	type: "Type",
	status: "Status",
	ownerName: "Author",
	currentRound: "Round",
	todo: "TODO",
	createdAt: "Submitted",
	updatedAt: "Last updated",
	actions: "Actions",
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
					rowDataTestId="submission-row"
					storageKey="admin-submissions"
					initialColumnVisibility={{ updatedAt: false }}
					mobileCard={SubmissionMobileCard}
					toolbar={(table) => (
						<DataTableToolbar
							table={table}
							searchKey="title"
							searchPlaceholder="Search submissions..."
							columnLabels={columnLabels}
							actions={
								<>
									<SubmissionExportButton table={table} />
									<SubmissionBulkActions
										table={table}
										onSuccess={() =>
											queryClient.invalidateQueries({
												queryKey: adminSubmissionsQueryOptions().queryKey,
											})
										}
									/>
								</>
							}
						/>
					)}
				/>
			</div>
		</div>
	);
}
