import { createFileRoute } from "@tanstack/react-router";
import { adminRequestMiddleware } from "@/features/auth/server/middleware";
import { markOverdueAssignments } from "@/features/reviews/server/assignments";
import {
	sendDeadlineReminders,
	sendReviewerReminders,
	sendRevisionReminders,
} from "@/features/submissions/server/reminders";
import { lookup } from "@/shared/lib/lookup";

const TASK_RUNNERS = {
	"assignments:overdue": async () => ({
		overdue: await markOverdueAssignments(),
	}),
	"mails:reminder": async () => {
		const reviewerReminders = await sendReviewerReminders();
		const revisionReminders = await sendRevisionReminders();
		const deadlineReminders = await sendDeadlineReminders();
		return { reviewerReminders, revisionReminders, deadlineReminders };
	},
} satisfies Record<string, () => Promise<Record<string, number>>>;

export const Route = createFileRoute("/api/admin/tasks/$name")({
	server: {
		middleware: [adminRequestMiddleware],
		handlers: {
			POST: async ({ params }) => {
				const runner = lookup(TASK_RUNNERS, params.name);
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
