import { setup } from "xstate";
import type { AssignmentContext, AssignmentEvent } from "../types";

export const assignmentMachine = setup({
	types: {
		// SAFETY: xstate setup() types-only slot; the value is never read.
		context: {} as AssignmentContext,
		// SAFETY: xstate setup() types-only slot; the value is never read.
		events: {} as AssignmentEvent,
	},
}).createMachine({
	id: "assignment",
	initial: "PENDING",
	context: {
		assignmentId: "",
		submissionId: "",
		reviewerId: "",
		round: 1,
	},
	states: {
		PENDING: {
			on: {
				COMPLETE: "COMPLETED",
				CANCEL: "CANCELLED",
				MARK_OVERDUE: "OVERDUE",
			},
		},
		OVERDUE: {
			on: {
				COMPLETE: "COMPLETED",
				CANCEL: "CANCELLED",
			},
		},
		COMPLETED: {
			type: "final",
		},
		CANCELLED: {
			type: "final",
		},
	},
});
