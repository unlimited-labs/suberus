import { IconClipboardCheck } from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DataTable, DataTableToolbar } from "@/components/admin/data-table";
import { PageHeader } from "@/components/layout/page-header";
import { reviewColumns } from "@/components/reviews/review-columns";
import { ReviewMobileCard } from "@/components/reviews/review-mobile-card";
import type { MockReviewAssignment } from "@/lib/mock-data/review-assignments";
import { getReviewerAssignments } from "@/lib/server/reviewer/assignments";

export const Route = createFileRoute("/_app/reviews/")({
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
	// TODO: Replace with actual logged-in reviewer ID from auth
	const reviewerId = "user-007"; // Mock: Marek Kowal (REVIEWER)

	const [assignments] = useState<MockReviewAssignment[]>(
		() => getReviewerAssignments(reviewerId).assignments,
	);

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
						data={assignments}
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
