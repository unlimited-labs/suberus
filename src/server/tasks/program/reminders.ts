import { defineTask } from "nitro/task";
import { sendFavouriteReminders } from "@/features/planner/server/reminders";
import { logger } from "@/logger";

export default defineTask({
	meta: {
		name: "program:reminders",
		description: "Push reminders for favourited presentations starting soon",
	},
	async run() {
		const sent = await sendFavouriteReminders();
		if (sent > 0) logger.info(`[task:program:reminders] sent=${sent}`);
		return { result: { sent } };
	},
});
