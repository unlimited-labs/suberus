import { defineTask } from "nitro/task";
import { markOverdueAssignments } from "@/features/reviews/server/assignments";
import { logger } from "@/logger";

export default defineTask({
	meta: {
		name: "assignments:overdue",
		description: "Mark overdue review assignments",
	},
	async run() {
		logger.info("[task:assignments:overdue] started");
		const overdue = await markOverdueAssignments();
		logger.info(`[task:assignments:overdue] done, marked ${overdue}`);
		return { result: { overdue } };
	},
});
