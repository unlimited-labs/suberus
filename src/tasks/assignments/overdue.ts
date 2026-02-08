import { defineTask } from "nitro/task";
import { markOverdueAssignments } from "../../utils/assignments.server";

export default defineTask({
	meta: {
		name: "assignments:overdue",
		description: "Mark overdue review assignments",
	},
	async run() {
		const overdue = await markOverdueAssignments();
		return { result: { overdue } };
	},
});
