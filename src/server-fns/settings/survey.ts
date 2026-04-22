import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { adminMiddleware, authMiddleware } from "@/lib/server/middleware/auth";
import { getSetting } from "@/lib/server/settings";
import {
	acceptTos,
	createSurveyQuestion,
	deleteSurveyQuestion,
	getSurveyQuestions,
	getUserSurveyAnswers,
	reorderSurveyQuestions,
	updateSurveyQuestion,
	upsertSurveyAnswers,
} from "@/lib/server/survey";

export const activeSurveyQuestionsQueryOptions = () =>
	queryOptions({
		queryKey: ["survey", "questions", "active"],
		queryFn: () => getActiveSurveyQuestionsFn(),
	});

export const userSurveyAnswersQueryOptions = () =>
	queryOptions({
		queryKey: ["survey", "answers"],
		queryFn: () => getUserSurveyAnswersFn(),
	});

export const adminSurveyQuestionsQueryOptions = () =>
	queryOptions({
		queryKey: ["survey", "questions", "all"],
		queryFn: () => getSurveyQuestionsFn(),
	});

// ── Admin functions ──

export const getSurveyQuestionsFn = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.handler(async () => {
		return getSurveyQuestions();
	});

export const createSurveyQuestionFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(
		z.object({
			label: z.string().min(1),
			orderIndex: z.number().int().min(0),
			type: z
				.enum(["CHECKBOX", "TEXT", "SINGLE_SELECT", "MULTI_SELECT"])
				.optional(),
			options: z.array(z.string().min(1)).optional(),
			isRequired: z.boolean().optional(),
		}),
	)
	.handler(async ({ data }) => {
		return createSurveyQuestion(
			data.label,
			data.orderIndex,
			data.type,
			data.options,
			data.isRequired,
		);
	});

export const updateSurveyQuestionFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(
		z.object({
			id: z.string().uuid(),
			label: z.string().min(1).optional(),
			orderIndex: z.number().int().min(0).optional(),
			isActive: z.boolean().optional(),
			type: z
				.enum(["CHECKBOX", "TEXT", "SINGLE_SELECT", "MULTI_SELECT"])
				.optional(),
			options: z.array(z.string().min(1)).nullable().optional(),
			isRequired: z.boolean().optional(),
		}),
	)
	.handler(async ({ data }) => {
		const { id, ...rest } = data;
		return updateSurveyQuestion(id, rest);
	});

export const deleteSurveyQuestionFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(z.object({ id: z.string().uuid() }))
	.handler(async ({ data }) => {
		await deleteSurveyQuestion(data.id);
		return { success: true };
	});

export const reorderSurveyQuestionsFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.inputValidator(z.object({ orderedIds: z.array(z.string().uuid()) }))
	.handler(async ({ data }) => {
		await reorderSurveyQuestions(data.orderedIds);
		return { success: true };
	});

// ── Authenticated user functions ──

export const getActiveSurveyQuestionsFn = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async () => {
		return getSurveyQuestions(true);
	});

export const getUserSurveyAnswersFn = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async ({ context }) => {
		return getUserSurveyAnswers(context.user.id);
	});

export const saveUserSurveyAnswersFn = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.inputValidator(
		z.object({
			answers: z.array(
				z.object({ questionId: z.string().uuid(), value: z.string().max(500) }),
			),
		}),
	)
	.handler(async ({ context, data }) => {
		await upsertSurveyAnswers(context.user.id, data.answers);
		return { success: true };
	});

export const acceptTosFn = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.handler(async ({ context }) => {
		await acceptTos(context.user.id);
		return { success: true };
	});

// ── Public functions (no auth, for registration) ──

export const getSurveyQuestionsForRegistrationFn = createServerFn({
	method: "GET",
}).handler(async () => {
	return getSurveyQuestions(true);
});

export const getTosContentForRegistrationFn = createServerFn({
	method: "GET",
}).handler(async () => {
	return getSetting("TOS_CONTENT");
});
