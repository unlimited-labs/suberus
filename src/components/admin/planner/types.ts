import type { listBreaks } from "@/lib/server/planner/breaks";

export type { ProgramSessionDetail as PlannerSession } from "@/lib/server/planner/sessions";

export type PlannerBreak = Awaited<ReturnType<typeof listBreaks>>[number];
