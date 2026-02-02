import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { adminMiddleware } from "./auth.middleware";
import {
	deskRejectSubmission,
	executeSubmissionTransition,
	submitEditorDecision,
} from "./workflow.server";
import type { TransitionResult } from "@/lib/workflow";

/** Desk reject submission (editor) */
export const deskRejectFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(
		z.object({
			submissionId: z.string().uuid(),
			reason: z.string().min(1, "Reason is required"),
		}),
	)
	.handler(async ({ data, context }): Promise<TransitionResult> => {
		return deskRejectSubmission(
			data.submissionId,
			context.user.id,
			data.reason,
		);
	});

/** Submit editor decision (editor) */
export const submitEditorDecisionFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(
		z.object({
			submissionId: z.string().uuid(),
			decision: z.enum([
				"ACCEPT",
				"CONDITIONALLY_ACCEPT",
				"REVISE_AND_RESUBMIT",
				"REJECT",
			]),
			reasoning: z.string().optional(),
			letterToAuthor: z.string().optional(),
		}),
	)
	.handler(async ({ data, context }): Promise<TransitionResult> => {
		return submitEditorDecision(
			data.submissionId,
			context.user.id,
			data.decision,
			data.reasoning,
			data.letterToAuthor,
		);
	});

/** Manual transition to REVIEWS_COMPLETE (editor) */
export const transitionToReviewsCompleteFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(z.object({ submissionId: z.string().uuid() }))
	.handler(async ({ data, context }): Promise<TransitionResult> => {
		return executeSubmissionTransition(
			data.submissionId,
			{ type: "MANUAL_TRANSITION_TO_REVIEWS_COMPLETE" },
			context.user.id,
			"Editor manually transitioned to reviews complete",
		);
	});

/** Manual transition to AWAITING_DECISION (editor) */
export const transitionToAwaitingDecisionFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(z.object({ submissionId: z.string().uuid() }))
	.handler(async ({ data, context }): Promise<TransitionResult> => {
		return executeSubmissionTransition(
			data.submissionId,
			{ type: "MANUAL_TRANSITION_TO_AWAITING_DECISION" },
			context.user.id,
			"Editor transitioned to awaiting decision",
		);
	});
