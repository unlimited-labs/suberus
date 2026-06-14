import type { listBreaks } from "@/features/planner/server/breaks";

export type { ProgramSessionDetail as PlannerSession } from "@/features/planner/server/sessions";

export type PlannerBreak = Awaited<ReturnType<typeof listBreaks>>[number];
