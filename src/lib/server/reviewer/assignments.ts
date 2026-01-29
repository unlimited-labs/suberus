import type { AssignmentStatus } from "@/generated/prisma";
import {
	getReviewAssignmentsForReviewer,
	type MockReviewAssignment,
} from "@/lib/mock-data/review-assignments";

export interface ReviewerAssignmentsFilters {
	search?: string;
	status?: AssignmentStatus[];
}

export interface GetReviewerAssignmentsResponse {
	assignments: MockReviewAssignment[];
	total: number;
}

export function getReviewerAssignments(
	reviewerId: string,
	filters?: ReviewerAssignmentsFilters,
): GetReviewerAssignmentsResponse {
	// TODO: Replace with server function when auth is implemented

	let filtered = getReviewAssignmentsForReviewer(reviewerId);

	// Search filter
	if (filters?.search) {
		const search = filters.search.toLowerCase();
		filtered = filtered.filter(
			(a) =>
				a.submissionTitle.toLowerCase().includes(search) ||
				a.authorName.toLowerCase().includes(search) ||
				a.authorAffiliation.toLowerCase().includes(search),
		);
	}

	// Status filter
	if (filters?.status && filters.status.length > 0) {
		filtered = filtered.filter((a) => filters.status?.includes(a.status));
	}

	// Sort by urgency: OVERDUE -> urgent (≤3d) -> by deadline asc -> no deadline
	const sorted = filtered.sort((a, b) => {
		const now = new Date();

		// Completed items go to bottom
		if (a.status === "COMPLETED" && b.status !== "COMPLETED") return 1;
		if (b.status === "COMPLETED" && a.status !== "COMPLETED") return -1;
		if (a.status === "COMPLETED" && b.status === "COMPLETED") return 0;

		// OVERDUE items first
		const aOverdue = a.status === "OVERDUE" || (a.deadline && a.deadline < now);
		const bOverdue = b.status === "OVERDUE" || (b.deadline && b.deadline < now);
		if (aOverdue && !bOverdue) return -1;
		if (!aOverdue && bOverdue) return 1;

		// Then by deadline (closest first)
		if (!a.deadline && !b.deadline) return 0;
		if (!a.deadline) return 1;
		if (!b.deadline) return -1;
		return a.deadline.getTime() - b.deadline.getTime();
	});

	return {
		assignments: sorted,
		total: sorted.length,
	};
}
