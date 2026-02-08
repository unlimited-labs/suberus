import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/db";
import {
	type GetSubmissionsResponse,
	getAdminSubmissions,
	getSubmissionForEditor,
} from "./admin-submissions.server";
import { adminMiddleware } from "./auth.middleware";

async function validateActiveSession(sessionId: string) {
	const session = await prisma.conferenceSession.findUnique({
		where: { id: sessionId },
		select: { isActive: true },
	});
	if (!session) throw new Response("Session not found", { status: 404 });
	if (!session.isActive)
		throw new Response("Session is not active", { status: 400 });
}

const submissionTypeEnum = z.enum(["ABSTRACT", "FULL_PAPER", "POSTER"]);
const submissionStatusEnum = z.enum([
	"DRAFT",
	"SUBMITTED",
	"UNDER_REVIEW",
	"REVIEWS_COMPLETE",
	"AWAITING_DECISION",
	"REVISE_REQUIRED",
	"RESUBMITTED",
	"ACCEPTED",
	"CONDITIONALLY_ACCEPTED",
	"REJECTED",
	"WITHDRAWN",
]);

/** Get all submissions for admin view */
export const getAdminSubmissionsFn = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.inputValidator(
		z
			.object({
				search: z.string().optional(),
				type: z.array(submissionTypeEnum).optional(),
				status: z.array(submissionStatusEnum).optional(),
			})
			.optional(),
	)
	.handler(async ({ data }): Promise<GetSubmissionsResponse> => {
		return getAdminSubmissions(data ?? {});
	});

/** Get submission details for editor */
export const getSubmissionForEditorFn = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.inputValidator(z.object({ submissionId: z.string().uuid() }))
	.handler(async ({ data }) => {
		return getSubmissionForEditor(data.submissionId);
	});

/** Update submission session assignment */
export const updateSubmissionSessionFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(
		z.object({
			submissionId: z.string().uuid(),
			sessionId: z.string().uuid().nullable(),
		}),
	)
	.handler(async ({ data }) => {
		// Validate submission type is ABSTRACT
		const submission = await prisma.submission.findUnique({
			where: { id: data.submissionId },
			select: { type: true },
		});

		if (!submission) {
			throw new Response("Submission not found", { status: 404 });
		}

		if (submission.type !== "ABSTRACT") {
			throw new Response(
				"Only ABSTRACT submissions can be assigned to sessions",
				{ status: 400 },
			);
		}

		if (data.sessionId) {
			await validateActiveSession(data.sessionId);
		}

		await prisma.submission.update({
			where: { id: data.submissionId },
			data: { sessionId: data.sessionId },
		});
	});

/** Bulk update session assignment for multiple submissions */
export const bulkUpdateSubmissionSessionFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(
		z.object({
			submissionIds: z.array(z.string().uuid()).min(1),
			sessionId: z.string().uuid().nullable(),
		}),
	)
	.handler(async ({ data }) => {
		// Validate all submissions are ABSTRACT
		const submissions = await prisma.submission.findMany({
			where: { id: { in: data.submissionIds } },
			select: { id: true, type: true },
		});

		const nonAbstractSubmissions = submissions.filter(
			(s) => s.type !== "ABSTRACT",
		);

		if (nonAbstractSubmissions.length > 0) {
			throw new Response(
				`The following submissions are not ABSTRACT and cannot be assigned to sessions: ${nonAbstractSubmissions.map((s) => s.id).join(", ")}`,
				{ status: 400 },
			);
		}

		if (data.sessionId) {
			await validateActiveSession(data.sessionId);
		}

		// Update all submissions
		await prisma.submission.updateMany({
			where: { id: { in: data.submissionIds } },
			data: { sessionId: data.sessionId },
		});

		return { updated: data.submissionIds.length };
	});
