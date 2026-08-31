import { IconClipboardCheck } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	myAssignmentsQueryOptions,
	type ReviewerAssignment,
} from "@/features/reviews/api/assignments";
import { reviewColumns } from "@/features/reviews/components/review-columns";
import { ReviewMobileCard } from "@/features/reviews/components/review-mobile-card";
import { PageHeader } from "@/shared/components/layout/page-header";
import { DataTable, DataTableToolbar } from "@/shared/ui/data-table";

export const Route = createFileRoute("/_app/reviews/")({
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(myAssignmentsQueryOptions());
	},
	component: ReviewsPage,
});

const columnLabels = {
	submissionTitle: "Submission",
	authorName: "Author",
	status: "Status",
	deadline: "Deadline",
	submissionType: "Type",
} satisfies Record<string, string>;

function ReviewsPage() {
	const { data: result } = useSuspenseQuery(myAssignmentsQueryOptions());
	const assignments = result.assignments;

	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconClipboardCheck} title="Reviews" />
			<div className="flex-1 overflow-auto p-6 md:flex md:min-h-0 md:flex-col md:overflow-hidden">
				{assignments.length === 0 ? (
					<div className="border-border text-muted-foreground rounded-lg border p-8 text-center">
						No reviews assigned
					</div>
				) : (
					<DataTable
						columns={reviewColumns}
						// SAFETY: the loader query returns exactly this row shape.
						data={assignments as ReviewerAssignment[]}
						getRowId={(row) => row.id}
						mobileCard={ReviewMobileCard}
						rowDataTestId="assignment-row"
						toolbar={(table) => (
							<DataTableToolbar
								columnLabels={columnLabels}
								searchKey="submissionTitle"
								searchPlaceholder="Search submissions..."
								table={table}
							/>
						)}
					/>
				)}
			</div>
		</div>
	);
}
