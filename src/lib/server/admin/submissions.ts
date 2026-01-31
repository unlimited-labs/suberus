import type { SubmissionStatus, SubmissionType } from "@/generated/prisma/enums";
import {
	type MockSubmission,
	mockSubmissions,
} from "@/lib/mock-data/submissions";
import { mockUsers } from "@/lib/mock-data/users";

export interface AdminSubmission extends MockSubmission {
	ownerName: string;
	ownerEmail: string;
	reviewerCount: number;
}

export interface SubmissionsFilters {
	search?: string;
	type?: SubmissionType[];
	status?: SubmissionStatus[];
}

export interface GetSubmissionsResponse {
	submissions: AdminSubmission[];
	total: number;
}

export function getAdminSubmissions(
	data: SubmissionsFilters,
): GetSubmissionsResponse {
	// TODO: Replace with server function when auth is implemented

	let filtered = [...mockSubmissions];

	// Search filter
	if (data.search) {
		const search = data.search.toLowerCase();
		filtered = filtered.filter(
			(s) =>
				s.title.toLowerCase().includes(search) ||
				s.authors.some(
					(a) =>
						a.firstName.toLowerCase().includes(search) ||
						a.lastName.toLowerCase().includes(search) ||
						a.email.toLowerCase().includes(search),
				),
		);
	}

	// Type filter
	if (data.type && data.type.length > 0) {
		filtered = filtered.filter((s) => data.type?.includes(s.type));
	}

	// Status filter
	if (data.status && data.status.length > 0) {
		filtered = filtered.filter((s) => data.status?.includes(s.status));
	}

	// Enhance with owner info (mock data - in real app this comes from joins)
	const enhanced: AdminSubmission[] = filtered.map((s) => {
		const presenter = s.authors.find((a) => a.isPresenter) ?? s.authors[0];
		return {
			...s,
			ownerName:
				`${presenter?.firstName ?? ""} ${presenter?.lastName ?? ""}`.trim(),
			ownerEmail: presenter?.email ?? "",
			reviewerCount: 0, // Would come from ReviewAssignment relation
		};
	});

	return {
		submissions: enhanced,
		total: enhanced.length,
	};
}

// Valid status transitions based on WORKFLOW.md
const validTransitions: Record<SubmissionStatus, SubmissionStatus[]> = {
	DRAFT: ["SUBMITTED", "WITHDRAWN"],
	SUBMITTED: ["UNDER_REVIEW", "WITHDRAWN"],
	UNDER_REVIEW: ["REVIEWS_COMPLETE", "WITHDRAWN"],
	REVIEWS_COMPLETE: ["AWAITING_DECISION"],
	AWAITING_DECISION: [
		"ACCEPTED",
		"CONDITIONALLY_ACCEPTED",
		"REVISE_REQUIRED",
		"REJECTED",
	],
	REVISE_REQUIRED: ["RESUBMITTED", "WITHDRAWN"],
	RESUBMITTED: ["UNDER_REVIEW"],
	ACCEPTED: [],
	CONDITIONALLY_ACCEPTED: ["ACCEPTED", "REJECTED"],
	REJECTED: [],
	WITHDRAWN: [],
};

export interface BulkChangeStatusInput {
	submissionIds: string[];
	status: SubmissionStatus;
}

export function bulkChangeStatus(data: BulkChangeStatusInput): {
	success: boolean;
	updated: number;
	errors: string[];
} {
	// TODO: Replace with server function when auth is implemented

	let updated = 0;
	const errors: string[] = [];

	for (const submissionId of data.submissionIds) {
		const submission = mockSubmissions.find((s) => s.id === submissionId);
		if (!submission) {
			errors.push(`Nie znaleziono zgłoszenia: ${submissionId}`);
			continue;
		}

		const allowedTransitions = validTransitions[submission.status];
		if (!allowedTransitions.includes(data.status)) {
			errors.push(
				`Niedozwolona zmiana statusu dla "${submission.title}": ${submission.status} → ${data.status}`,
			);
			continue;
		}

		submission.status = data.status;
		submission.updatedAt = new Date();
		updated++;
	}

	return { success: errors.length === 0, updated, errors };
}

export interface AssignReviewerInput {
	submissionIds: string[];
	reviewerId: string;
}

export function assignReviewer(data: AssignReviewerInput): {
	success: boolean;
	assigned: number;
	errors: string[];
} {
	// TODO: Replace with server function when auth is implemented

	const reviewer = mockUsers.find((u) => u.id === data.reviewerId);
	if (!reviewer) {
		return {
			success: false,
			assigned: 0,
			errors: ["Nie znaleziono recenzenta"],
		};
	}

	let assigned = 0;
	const errors: string[] = [];

	for (const submissionId of data.submissionIds) {
		const submission = mockSubmissions.find((s) => s.id === submissionId);
		if (!submission) {
			errors.push(`Nie znaleziono zgłoszenia: ${submissionId}`);
			continue;
		}

		// In real app: create ReviewAssignment record
		// For mock: just count as success
		assigned++;
	}

	return { success: errors.length === 0, assigned, errors };
}
