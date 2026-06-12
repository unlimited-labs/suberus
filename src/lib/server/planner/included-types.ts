import type { SubmissionType } from "@/generated/prisma/enums";
import { getSubmissionTypeConfigs } from "@/lib/server/settings";

/** Submission types admitted to the planner (pool, create-session validation, capacity). */
export async function getPlannerIncludedTypes(): Promise<SubmissionType[]> {
	const configs = await getSubmissionTypeConfigs();
	const types: SubmissionType[] = [];
	if (configs.ORAL_PRESENTATION.includeInPlanner) types.push("ABSTRACT");
	if (configs.POSTER.includeInPlanner) types.push("POSTER");
	if (configs.FULL_PAPER.includeInPlanner) types.push("FULL_PAPER");
	if (configs.EXHIBITOR.includeInPlanner) types.push("EXHIBITOR");
	return types;
}
