import { defineTask } from "nitro/task";
import { logger } from "@/logger";
import {
	sendDeadlineReminders,
	sendReviewerReminders,
	sendRevisionReminders,
} from "@/utils/reminders.server";

export default defineTask({
	meta: {
		name: "mails:reminder",
		description: "Send reminder emails to reviewers and authors",
	},
	async run() {
		logger.info("[task:mails:reminder] started");
		const reviewerReminders = await sendReviewerReminders();
		const revisionReminders = await sendRevisionReminders();
		const deadlineReminders = await sendDeadlineReminders();
		logger.info(
			`[task:mails:reminder] done — reviewer=${reviewerReminders} revision=${revisionReminders} deadline=${deadlineReminders}`,
		);
		return {
			result: {
				reviewerReminders,
				revisionReminders,
				deadlineReminders,
			},
		};
	},
});
