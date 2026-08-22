import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
	adminMiddleware,
	authMiddleware,
} from "@/features/auth/server/middleware";
import { getSetting } from "@/features/settings/server/settings";
import {
	acceptTos,
	createSurveyQuestion,
	deleteSurveyQuestion,
	getSurveyQuestions,
	getUserSurveyAnswers,
	importSurveyTemplate,
	reorderSurveyQuestions,
	updateSurveyQuestion,
	upsertSurveyAnswers,
	visibleAudiences,
} from "@/features/survey/server/survey";

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

export const getSurveyQuestionsFn = createServerFn({ method: "GET" })
	.middleware([adminMiddleware])
	.handler(async () => {
		return getSurveyQuestions();
	});

export const createSurveyQuestionFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(
		z.object({
			label: z.string().min(1),
			orderIndex: z.number().int().min(0),
			type: z
				.enum(["CHECKBOX", "TEXT", "SINGLE_SELECT", "MULTI_SELECT"])
				.optional(),
			options: z.array(z.string().min(1)).optional(),
			allowOther: z.boolean().optional(),
			isRequired: z.boolean().optional(),
			showInUsersList: z.boolean().optional(),
			fieldName: z.string().nullable().optional(),
			audience: z.enum(["ALL", "PARTICIPANTS", "EXHIBITORS"]).optional(),
		}),
	)
	.handler(async ({ data }) => {
		return createSurveyQuestion(
			data.label,
			data.orderIndex,
			data.type,
			data.options,
			data.allowOther,
			data.isRequired,
			data.showInUsersList,
			data.fieldName,
			data.audience,
		);
	});

export const updateSurveyQuestionFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(
		z.object({
			id: z.uuid(),
			label: z.string().min(1).optional(),
			orderIndex: z.number().int().min(0).optional(),
			isActive: z.boolean().optional(),
			type: z
				.enum(["CHECKBOX", "TEXT", "SINGLE_SELECT", "MULTI_SELECT"])
				.optional(),
			options: z.array(z.string().min(1)).nullable().optional(),
			allowOther: z.boolean().optional(),
			isRequired: z.boolean().optional(),
			showInUsersList: z.boolean().optional(),
			fieldName: z.string().nullable().optional(),
			audience: z.enum(["ALL", "PARTICIPANTS", "EXHIBITORS"]).optional(),
		}),
	)
	.handler(async ({ data }) => {
		const { id, ...rest } = data;
		return updateSurveyQuestion(id, rest);
	});

export const deleteSurveyQuestionFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(z.object({ id: z.uuid() }))
	.handler(async ({ data }) => {
		await deleteSurveyQuestion(data.id);
		return { success: true };
	});

export const importSurveyTemplateFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(z.object({ templateId: z.string().min(1) }))
	.handler(async ({ data }) => importSurveyTemplate(data.templateId));

export const reorderSurveyQuestionsFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(z.object({ orderedIds: z.array(z.uuid()) }))
	.handler(async ({ data }) => {
		await reorderSurveyQuestions(data.orderedIds);
		return { success: true };
	});

export const getActiveSurveyQuestionsFn = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async ({ context }) => {
		return getSurveyQuestions(true, visibleAudiences(context.user.role));
	});

export const getUserSurveyAnswersFn = createServerFn({ method: "GET" })
	.middleware([authMiddleware])
	.handler(async ({ context }) => {
		return getUserSurveyAnswers(context.user.id);
	});

export const saveUserSurveyAnswersFn = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.validator(
		z.object({
			answers: z.array(
				z.object({ questionId: z.uuid(), value: z.string().max(500) }),
			),
		}),
	)
	.handler(async ({ context, data }) => {
		await upsertSurveyAnswers(context.user.id, data.answers);
		return { success: true };
	});

export const saveAdminUserSurveyAnswersFn = createServerFn({ method: "POST" })
	.middleware([adminMiddleware])
	.validator(
		z.object({
			userId: z.uuid(),
			answers: z.array(
				z.object({ questionId: z.uuid(), value: z.string().max(500) }),
			),
		}),
	)
	.handler(async ({ data }) => {
		await upsertSurveyAnswers(data.userId, data.answers);
		return { success: true };
	});

export const acceptTosFn = createServerFn({ method: "POST" })
	.middleware([authMiddleware])
	.handler(async ({ context }) => {
		await acceptTos(context.user.id);
		return { success: true };
	});

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
