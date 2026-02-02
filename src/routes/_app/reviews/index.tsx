import { IconClipboardCheck } from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import { DataTable, DataTableToolbar } from "@/components/admin/data-table";
import { PageHeader } from "@/components/layout/page-header";
import { reviewColumns } from "@/components/reviews/review-columns";
import { ReviewMobileCard } from "@/components/reviews/review-mobile-card";
import {
	getMyAssignmentsFn,
	type ReviewerAssignment,
} from "@/utils/assignments.functions";

export const Route = createFileRoute("/_app/reviews/")({
	loader: async () => {
		const result = await getMyAssignmentsFn();
		return { assignments: result.assignments };
	},
	component: ReviewsPage,
});

const columnLabels: Record<string, string> = {
	submissionTitle: "Submission",
	authorName: "Author",
	status: "Status",
	deadline: "Deadline",
	submissionType: "Type",
};

function ReviewsPage() {
	const { assignments } = Route.useLoaderData();

	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconClipboardCheck} title="Reviews" />
			<div className="flex-1 overflow-auto p-6">
				{assignments.length === 0 ? (
					<div className="rounded-lg border border-border p-8 text-center text-muted-foreground">
						No reviews assigned
					</div>
				) : (
					<DataTable
						columns={reviewColumns}
						data={assignments as ReviewerAssignment[]}
						getRowId={(row) => row.id}
						mobileCard={ReviewMobileCard}
						toolbar={(table) => (
							<DataTableToolbar
								table={table}
								searchKey="submissionTitle"
								searchPlaceholder="Search submissions..."
								columnLabels={columnLabels}
							/>
						)}
					/>
				)}
			</div>
		</div>
	);
}
