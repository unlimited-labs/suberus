import { getSubmissionTypeConfigs } from "@/features/settings/server/settings";
import type { SubmissionType } from "@/generated/prisma/enums";

export async function getPlannerIncludedTypes(): Promise<SubmissionType[]> {
	const configs = await getSubmissionTypeConfigs();
	const types: SubmissionType[] = [];
	if (configs.ORAL_PRESENTATION.includeInPlanner) types.push("ABSTRACT");
	if (configs.POSTER.includeInPlanner) types.push("POSTER");
	if (configs.FULL_PAPER.includeInPlanner) types.push("FULL_PAPER");
	if (configs.EXHIBITOR.includeInPlanner) types.push("EXHIBITOR");
	return types;
}
