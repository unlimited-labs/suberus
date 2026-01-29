import type { AssignmentStatus, SubmissionType } from "@/generated/prisma";

export interface MockReviewAssignment {
	id: string;
	submissionId: string;
	submissionTitle: string;
	submissionType: SubmissionType;
	reviewerId: string;
	round: number;
	status: AssignmentStatus;
	assignedAt: Date;
	deadline: Date | null;
	startedAt: Date | null;
	completedAt: Date | null;
	// Author info (hidden in DOUBLE_BLIND)
	authorName: string;
	authorAffiliation: string;
	// Review mode for this submission type
	reviewMode: "OPEN" | "SINGLE_BLIND" | "DOUBLE_BLIND";
}

// Mock assignments for reviewer user-007 (Marek Kowal)
export const mockReviewAssignments: MockReviewAssignment[] = [
	{
		id: "assign-001",
		submissionId: "sub-001",
		submissionTitle: "Machine Learning Approaches to Software Bug Prediction",
		submissionType: "FULL_PAPER",
		reviewerId: "user-007",
		round: 1,
		status: "COMPLETED",
		assignedAt: new Date("2026-01-11T09:15:00"),
		deadline: new Date("2026-01-25T23:59:59"),
		startedAt: new Date("2026-01-13T10:00:00"),
		completedAt: new Date("2026-01-14T15:20:00"),
		authorName: "Jan Kowalski",
		authorAffiliation: "Poznan University of Technology",
		reviewMode: "SINGLE_BLIND",
	},
	{
		id: "assign-002",
		submissionId: "sub-004",
		submissionTitle:
			"Blockchain-Based Version Control Systems: Security and Performance Analysis",
		submissionType: "FULL_PAPER",
		reviewerId: "user-007",
		round: 1,
		status: "IN_PROGRESS",
		assignedAt: new Date("2026-01-13T09:00:00"),
		deadline: new Date("2026-02-03T23:59:59"),
		startedAt: new Date("2026-01-15T14:30:00"),
		completedAt: null,
		authorName: "Katarzyna Lewandowska",
		authorAffiliation: "AGH University of Science and Technology",
		reviewMode: "SINGLE_BLIND",
	},
	{
		id: "assign-003",
		submissionId: "sub-006",
		submissionTitle: "Quantum Computing Applications in Cryptography: A Survey",
		submissionType: "FULL_PAPER",
		reviewerId: "user-007",
		round: 1,
		status: "PENDING",
		assignedAt: new Date("2026-01-20T11:00:00"),
		deadline: new Date("2026-02-10T23:59:59"),
		startedAt: null,
		completedAt: null,
		authorName: "Anonymous Author",
		authorAffiliation: "Anonymous Institution",
		reviewMode: "DOUBLE_BLIND",
	},
	{
		id: "assign-004",
		submissionId: "sub-007",
		submissionTitle: "Code Refactoring Patterns for Legacy Enterprise Systems",
		submissionType: "ABSTRACT",
		reviewerId: "user-007",
		round: 1,
		status: "OVERDUE",
		assignedAt: new Date("2026-01-05T10:00:00"),
		deadline: new Date("2026-01-19T23:59:59"),
		startedAt: new Date("2026-01-06T09:00:00"),
		completedAt: null,
		authorName: "Piotr Nowak",
		authorAffiliation: "University of Warsaw",
		reviewMode: "SINGLE_BLIND",
	},
	{
		id: "assign-005",
		submissionId: "sub-008",
		submissionTitle: "DevOps Automation Tools: Comparative Performance Study",
		submissionType: "ABSTRACT",
		reviewerId: "user-007",
		round: 1,
		status: "PENDING",
		assignedAt: new Date("2026-01-22T14:00:00"),
		deadline: new Date("2026-02-05T23:59:59"),
		startedAt: null,
		completedAt: null,
		authorName: "Anna Górska",
		authorAffiliation: "Wroclaw University of Technology",
		reviewMode: "OPEN",
	},
];

export function getReviewAssignmentsForReviewer(
	reviewerId: string,
): MockReviewAssignment[] {
	return mockReviewAssignments.filter((a) => a.reviewerId === reviewerId);
}

export function getAssignmentById(
	id: string,
): MockReviewAssignment | undefined {
	return mockReviewAssignments.find((a) => a.id === id);
}
