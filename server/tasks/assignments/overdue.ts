import { defineTask } from "nitro/task";
import { logger } from "@/logger";
import { markOverdueAssignments } from "@/utils/assignments.server";

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
