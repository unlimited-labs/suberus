import { z } from "zod";
import { ActivityType } from "@/generated/prisma/enums";

export const activityLogListInput = z.object({
	type: z.array(z.enum(ActivityType)).optional(),
	userId: z.uuid().optional(),
	submissionId: z.uuid().optional(),
	performedBy: z.uuid().optional(),
	/** Inclusive lower bound on createdAt. */
	since: z.iso.datetime({ offset: true }).optional(),
	/** Exclusive upper bound on createdAt. */
	until: z.iso.datetime({ offset: true }).optional(),
	take: z.number().int().min(1).max(200).default(20),
	cursor: z.uuid().optional(),
});

export type ActivityLogFilters = z.infer<typeof activityLogListInput>;
