import { setup } from "xstate";
import type { AssignmentContext, AssignmentEvent } from "../types";

/**
 * Review assignment lifecycle state machine
 *
 * Handles assignment status transitions:
 * PENDING → IN_PROGRESS → COMPLETED
 *        → OVERDUE → COMPLETED or CANCELLED
 *        → CANCELLED
 */
export const assignmentMachine = setup({
	types: {
		context: {} as AssignmentContext,
		events: {} as AssignmentEvent,
	},
	guards: {
		hasDeadline: ({ context }) => {
			return context.deadline !== undefined;
		},
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
				START_REVIEW: "IN_PROGRESS",
				CANCEL: "CANCELLED",
				MARK_OVERDUE: "OVERDUE",
			},
		},
		IN_PROGRESS: {
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
