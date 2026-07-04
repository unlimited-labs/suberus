import type { Prisma } from "@/generated/prisma/client";
import type { ActivityType } from "@/generated/prisma/enums";
import { prisma } from "@/shared/server/db.server";
import type { ActivityDetail } from "../types";

export type LogActivityParams = {
	[K in ActivityType]: {
		type: K;
		userId?: string;
		submissionId?: string;
		performedBy?: string;
		detail?: Extract<ActivityDetail, { type: K }>;
	};
}[ActivityType];

function toData(params: LogActivityParams) {
	return {
		type: params.type,
		userId: params.userId,
		submissionId: params.submissionId,
		performedBy: params.performedBy,
		detail: (params.detail ?? undefined) as Prisma.InputJsonValue | undefined,
	};
}

/** Log an activity event */
export async function logActivity(params: LogActivityParams): Promise<void> {
	await prisma.activityLog.create({ data: toData(params) });
}

/** Log activity inside a Prisma transaction */
export async function logActivityTx(
	tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
	params: LogActivityParams,
): Promise<void> {
	await tx.activityLog.create({ data: toData(params) });
}
