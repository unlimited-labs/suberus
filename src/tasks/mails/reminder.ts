import { defineTask } from "nitro/task";
import {
	sendDeadlineReminders,
	sendReviewerReminders,
	sendRevisionReminders,
} from "../../utils/reminders.server";

export default defineTask({
	meta: {
		name: "mails:reminder",
		description: "Send reminder emails to reviewers and authors",
	},
	async run() {
		const reviewerReminders = await sendReviewerReminders();
		const revisionReminders = await sendRevisionReminders();
		const deadlineReminders = await sendDeadlineReminders();
		return {
			result: {
				reviewerReminders,
				revisionReminders,
				deadlineReminders,
			},
		};
	},
});
