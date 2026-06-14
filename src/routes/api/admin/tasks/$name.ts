import { createFileRoute } from "@tanstack/react-router";
import { markOverdueAssignments } from "@/lib/server/assignments";
import {
	sendDeadlineReminders,
	sendReviewerReminders,
	sendRevisionReminders,
} from "@/lib/server/reminders";
import { adminRequestMiddleware } from "@/shared/server/middleware/auth";

const TASK_RUNNERS: Record<string, () => Promise<Record<string, unknown>>> = {
	"assignments:overdue": async () => ({
		overdue: await markOverdueAssignments(),
	}),
	"mails:reminder": async () => {
		const reviewerReminders = await sendReviewerReminders();
		const revisionReminders = await sendRevisionReminders();
		const deadlineReminders = await sendDeadlineReminders();
		return { reviewerReminders, revisionReminders, deadlineReminders };
	},
};

export const Route = createFileRoute("/api/admin/tasks/$name")({
	server: {
		middleware: [adminRequestMiddleware],
		handlers: {
			POST: async ({ params }) => {
				const runner = TASK_RUNNERS[params.name];
				if (!runner) {
					return Response.json(
						{ error: `Unknown task: ${params.name}` },
						{ status: 404 },
					);
				}
				const result = await runner();
				return Response.json({ result });
			},
		},
	},
});
