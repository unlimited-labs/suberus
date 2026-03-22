import { setup } from "xstate";
import type { AssignmentContext, AssignmentEvent } from "../types";

/**
 * Review assignment lifecycle state machine
 *
 * Handles assignment status transitions:
 * PENDING → COMPLETED (reviewer submits review)
 *        → OVERDUE (deadline passed)
 *        → CANCELLED (editor cancels)
 * OVERDUE → COMPLETED or CANCELLED
 */
export const assignmentMachine = setup({
	types: {
		context: {} as AssignmentContext,
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
