import { prisma } from "@/db.server";
import type { ActivityType } from "@/generated/prisma/enums";

export interface LogActivityParams {
	type: ActivityType;
	userId?: string;
	submissionId?: string;
	performedBy?: string;
	detail?: object;
}

/** Log an activity event */
export async function logActivity(params: LogActivityParams): Promise<void> {
	await prisma.activityLog.create({
		data: {
			type: params.type,
			userId: params.userId,
			submissionId: params.submissionId,
			performedBy: params.performedBy,
			detail: params.detail ?? undefined,
		},
	});
}

/** Log activity inside a Prisma transaction */
export async function logActivityTx(
	tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
	params: LogActivityParams,
): Promise<void> {
	await tx.activityLog.create({
		data: {
			type: params.type,
			userId: params.userId,
			submissionId: params.submissionId,
			performedBy: params.performedBy,
			detail: params.detail ?? undefined,
		},
	});
}
