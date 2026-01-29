import { IconFileStack } from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import { DataTable, DataTableToolbar } from "@/components/admin/data-table";
import { submissionColumns } from "@/components/admin/submissions/columns";
import { SubmissionBulkActions } from "@/components/admin/submissions/submission-bulk-actions";
import { SubmissionMobileCard } from "@/components/admin/submissions/submission-mobile-card";
import { PageHeader } from "@/components/layout/page-header";
import {
	type MockSubmission,
	mockSubmissions,
} from "@/lib/mock-data/submissions";
import type { AdminSubmission } from "@/lib/server/admin/submissions";

export const Route = createFileRoute("/_app/admin/_layout/submissions/")({
	component: AdminSubmissionsPage,
});

function toAdminSubmission(submission: MockSubmission): AdminSubmission {
	const presenter =
		submission.authors.find((a) => a.isPresenter) ?? submission.authors[0];
	return {
		...submission,
		ownerName:
			`${presenter?.firstName ?? ""} ${presenter?.lastName ?? ""}`.trim(),
		ownerEmail: presenter?.email ?? "",
		reviewerCount: 0,
	};
}

const columnLabels: Record<string, string> = {
	title: "Title",
	type: "Type",
	status: "Status",
	ownerName: "Author",
	currentRound: "Round",
};

function AdminSubmissionsPage() {
	const adminSubmissions = mockSubmissions.map(toAdminSubmission);

	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconFileStack} title="Submissions" />
			<div className="flex-1 overflow-auto p-6">
				<DataTable
					columns={submissionColumns}
					data={adminSubmissions}
					getRowId={(row) => row.id}
					mobileCard={SubmissionMobileCard}
					toolbar={(table) => (
						<DataTableToolbar
							table={table}
							searchKey="title"
							searchPlaceholder="Search submissions..."
							columnLabels={columnLabels}
							actions={<SubmissionBulkActions table={table} />}
						/>
					)}
				/>
			</div>
		</div>
	);
}
