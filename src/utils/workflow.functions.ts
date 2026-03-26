import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { TransitionResult } from "@/lib/workflow";
import { adminMiddleware, authMiddleware } from "./auth.middleware";
import {
	confirmConditionsMet,
	deskAcceptSubmission,
	deskRejectSubmission,
	executeSubmissionTransition,
	overrideDecision,
	submitEditorDecision,
	withdrawSubmission,
} from "./workflow.server";

/** Withdraw submission (author) */
export const withdrawSubmissionFn = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.inputValidator(
		z.object({
			submissionId: z.uuid(),
			reason: z.string().optional(),
		}),
	)
	.handler(async ({ data, context }): Promise<TransitionResult> => {
		return withdrawSubmission(data.submissionId, context.user.id, data.reason);
	});

/** Desk accept submission (editor) */
export const deskAcceptFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(
		z.object({
			submissionId: z.uuid(),
			reason: z.string().min(1, "Reason is required"),
		}),
	)
	.handler(async ({ data, context }): Promise<TransitionResult> => {
		return deskAcceptSubmission(
			data.submissionId,
			context.user.id,
			data.reason,
		);
	});

/** Desk reject submission (editor) */
export const deskRejectFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(
		z.object({
			submissionId: z.uuid(),
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
			submissionId: z.uuid(),
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
	.inputValidator(z.object({ submissionId: z.uuid() }))
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
	.inputValidator(z.object({ submissionId: z.uuid() }))
	.handler(async ({ data, context }): Promise<TransitionResult> => {
		return executeSubmissionTransition(
			data.submissionId,
			{ type: "MANUAL_TRANSITION_TO_AWAITING_DECISION" },
			context.user.id,
			"Editor transitioned to awaiting decision",
		);
	});

/** Editor override — reopen decision from terminal state (editor) */
export const editorOverrideFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(
		z.object({
			submissionId: z.uuid(),
			reasoning: z.string().min(1, "Reasoning is required"),
		}),
	)
	.handler(async ({ data, context }): Promise<TransitionResult> => {
		return overrideDecision(data.submissionId, context.user.id, data.reasoning);
	});

/** Confirm conditions met — promote CONDITIONALLY_ACCEPTED to ACCEPTED (editor) */
export const confirmConditionsMetFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(
		z.object({
			submissionId: z.uuid(),
			reasoning: z.string().min(1, "Reasoning is required"),
		}),
	)
	.handler(async ({ data, context }): Promise<TransitionResult> => {
		return confirmConditionsMet(
			data.submissionId,
			context.user.id,
			data.reasoning,
		);
	});
