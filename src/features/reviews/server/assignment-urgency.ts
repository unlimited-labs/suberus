import { compareAsc } from "date-fns";
import type { AssignmentStatus } from "@/generated/prisma/enums";

/** Subset of assignment fields needed to rank by review urgency. */
interface AssignmentUrgency {
	status: AssignmentStatus;
	deadline: Date | null;
}

function isOverdue(a: AssignmentUrgency, now: Date): boolean {
	return a.status === "OVERDUE" || (a.deadline != null && a.deadline < now);
}

/**
 * Sort comparator ranking assignments by review urgency: completed last, then
 * overdue first, then by earliest deadline (assignments without a deadline last).
 */
export function compareAssignmentUrgency(
	a: AssignmentUrgency,
	b: AssignmentUrgency,
	now: Date,
): number {
	const aCompleted = a.status === "COMPLETED";
	const bCompleted = b.status === "COMPLETED";
	if (aCompleted !== bCompleted) return aCompleted ? 1 : -1;

	const aOverdue = isOverdue(a, now);
	const bOverdue = isOverdue(b, now);
	if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;

	if (!a.deadline && !b.deadline) return 0;
	if (!a.deadline) return 1;
	if (!b.deadline) return -1;
	return compareAsc(a.deadline, b.deadline);
}
