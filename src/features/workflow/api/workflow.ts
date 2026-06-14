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
	overrideDecision,
	submitEditorDecision,
	withdrawSubmission,
} from "@/features/workflow/server/workflow";
import { prisma } from "@/shared/server/db.server";

// Exhibitor entries are decided via the exhibitor approval flow, which also
// updates Exhibitor.status and notifies the exhibitor — block direct desk
// decisions and overrides here (the exhibitor flow calls the lib functions
// directly, so it is unaffected by this guard).
async function exhibitorGuard(
	submissionId: string,
): Promise<TransitionResult | null> {
	const submission = await prisma.submission.findUnique({
		where: { id: submissionId },
		select: { type: true, status: true },
	});
	if (submission?.type !== "EXHIBITOR") return null;
	return {
		success: false,
		fromState: submission.status,
		toState: submission.status,
		event: "BLOCKED",
		error:
			"Exhibitor entries are decided via the exhibitor approval flow, not desk decisions",
	};
}

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
	.inputValidator(
		z.object({
			submissionId: z.uuid(),
			reason: z.string().min(1, "Reason is required"),
		}),
	)
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
	.inputValidator(
		z.object({
			submissionId: z.uuid(),
			reason: z.string().min(1, "Reason is required"),
		}),
	)
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
		const blocked = await exhibitorGuard(data.submissionId);
		if (blocked) return blocked;
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
