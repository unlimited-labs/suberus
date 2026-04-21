import type { listBreaks } from "@/utils/schedule-breaks.server";

export type { ProgramSessionDetail as PlannerSession } from "@/utils/program-sessions.server";

export type PlannerBreak = Awaited<ReturnType<typeof listBreaks>>[number];
