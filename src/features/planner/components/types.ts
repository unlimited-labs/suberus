import type { listBreaks } from "@/features/planner/server/breaks";

export type { ProgramSessionDetail as PlannerSession } from "@/features/planner/server/sessions";

export type PlannerBreak = Awaited<ReturnType<typeof listBreaks>>[number];

/** Minimal user shape the chair picker needs. Supplied by the route so planner
 * stays decoupled from the users slice. */
export interface ChairCandidate {
	id: string;
	firstName: string | null;
	lastName: string | null;
	email: string;
}
