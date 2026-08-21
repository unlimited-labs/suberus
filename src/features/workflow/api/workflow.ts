import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
	adminMiddleware,
	authMiddleware,
} from "@/features/auth/server/middleware";
import type { TransitionResult } from "@/features/workflow";
import {
	confirmConditionsMet,
	deskAcceptSubmission,
	deskRejectSubmission,
	executeSubmissionTransition,
	exhibitorGuard,
	overrideDecision,
	submitEditorDecision,
	withdrawSubmission,
} from "@/features/workflow/server/workflow";
import { deskDecisionInput } from "@/features/workflow/validations";
import { prisma } from "@/shared/server/db.server";

/** Withdraw submission (author) */
export const withdrawSubmissionFn = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(
		z.object({
			submissionId: z.uuid(),
			reason: z.string().optional(),
		}),
	)
	.handler(async ({ data, context }): Promise<TransitionResult> => {
		const result = await withdrawSubmission(
			data.submissionId,
			context.user.id,
			data.reason,
		);
		// Keep the exhibitor application in sync when its linked presentation
		// is withdrawn outside the exhibitor panel
		if (result.success) {
			await prisma.exhibitor.updateMany({
				where: { submissionId: data.submissionId, status: "PENDING" },
				data: { status: "WITHDRAWN" },
			});
		}
		return result;
	});

/** Desk accept submission (editor) */
export const deskAcceptFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(deskDecisionInput)
	.handler(async ({ data, context }): Promise<TransitionResult> => {
		const blocked = await exhibitorGuard(data.submissionId);
		if (blocked) return blocked;
		return deskAcceptSubmission(
			data.submissionId,
			context.user.id,
			data.reason,
		);
	});

/** Desk reject submission (editor) */
export const deskRejectFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(deskDecisionInput)
	.handler(async ({ data, context }): Promise<TransitionResult> => {
		const blocked = await exhibitorGuard(data.submissionId);
		if (blocked) return blocked;
		return deskRejectSubmission(
			data.submissionId,
			context.user.id,
			data.reason,
		);
	});

/** Submit editor decision (editor) */
export const submitEditorDecisionFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(
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

/** Manual transition to AWAITING_DECISION (editor) */
export const transitionToAwaitingDecisionFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(z.object({ submissionId: z.uuid() }))
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
	.validator(
		z.object({
			submissionId: z.uuid(),
			reasoning: z.string().min(1, "Reasoning is required"),
		}),
	)
	.handler(async ({ data, context }): Promise<TransitionResult> => {
		const blocked = await exhibitorGuard(data.submissionId);
		if (blocked) return blocked;
		return overrideDecision(data.submissionId, context.user.id, data.reasoning);
	});

/** Confirm conditions met — promote CONDITIONALLY_ACCEPTED to ACCEPTED (editor) */
export const confirmConditionsMetFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(
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
