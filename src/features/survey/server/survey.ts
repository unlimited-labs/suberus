import { getSurveyTemplate } from "@/features/survey/templates";
import type { SurveyQuestion } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";
import type { SurveyQuestionType } from "@/generated/prisma/enums";
import { prisma } from "@/shared/server/db.server";

type TypedSurveyQuestion = Omit<SurveyQuestion, "options"> & {
	options: string[] | null;
};

function typeSurveyQuestion(q: SurveyQuestion): TypedSurveyQuestion {
	return { ...q, options: q.options as string[] | null };
}

/**
 * Get survey questions, optionally filtered by active status.
 */
export async function getSurveyQuestions(activeOnly = false) {
	const questions = await prisma.surveyQuestion.findMany({
		where: activeOnly ? { isActive: true } : undefined,
		orderBy: { orderIndex: "asc" },
	});
	return questions.map(typeSurveyQuestion);
}

/**
 * Create a new survey question.
 */
export async function createSurveyQuestion(
	label: string,
	orderIndex: number,
	type?: SurveyQuestionType,
	options?: string[],
	allowOther?: boolean,
	isRequired?: boolean,
	showInUsersList?: boolean,
	fieldName?: string | null,
) {
	const created = await prisma.surveyQuestion.create({
		data: {
			label,
			orderIndex,
			...(type && { type }),
			...(options && { options }),
			...(allowOther !== undefined && { allowOther }),
			...(isRequired !== undefined && { isRequired }),
			...(showInUsersList !== undefined && { showInUsersList }),
			...(fieldName !== undefined && { fieldName: fieldName || null }),
		},
	});
	return typeSurveyQuestion(created);
}

/**
 * Update a survey question (partial).
 */
export async function updateSurveyQuestion(
	id: string,
	data: {
		label?: string;
		orderIndex?: number;
		isActive?: boolean;
		type?: SurveyQuestionType;
		options?: string[] | null;
		allowOther?: boolean;
		isRequired?: boolean;
		showInUsersList?: boolean;
		fieldName?: string | null;
	},
) {
	const { options, fieldName, ...rest } = data;
	return prisma.surveyQuestion.update({
		where: { id },
		data: {
			...rest,
			...(options !== undefined && {
				options: options === null ? Prisma.DbNull : options,
			}),
			...(fieldName !== undefined && { fieldName: fieldName || null }),
		},
	});
}

/**
 * Delete a survey question and its answers.
 */
export async function deleteSurveyQuestion(id: string) {
	return prisma.$transaction([
		prisma.surveyAnswer.deleteMany({ where: { questionId: id } }),
		prisma.surveyQuestion.delete({ where: { id } }),
	]);
}

/**
 * Import a predefined template: create its questions appended after existing ones.
 */
export async function importSurveyTemplate(templateId: string) {
	const template = getSurveyTemplate(templateId);
	if (!template) throw new Error(`Unknown template: ${templateId}`);

	const count = await prisma.surveyQuestion.count();
	const created = await prisma.$transaction(
		template.questions.map((q, i) =>
			prisma.surveyQuestion.create({
				data: {
					label: q.label,
					orderIndex: count + i,
					type: q.type,
					...(q.options && { options: q.options }),
					allowOther: q.allowOther ?? false,
					isRequired: q.isRequired ?? false,
				},
			}),
		),
	);
	return created.map(typeSurveyQuestion);
}

/**
 * Reorder survey questions by setting orderIndex based on array position.
 */
export async function reorderSurveyQuestions(orderedIds: string[]) {
	return prisma.$transaction(
		orderedIds.map((id, index) =>
			prisma.surveyQuestion.update({
				where: { id },
				data: { orderIndex: index },
			}),
		),
	);
}

/**
 * Get a user's survey answers with question data.
 */
export async function getUserSurveyAnswers(userId: string) {
	return prisma.surveyAnswer.findMany({
		where: { userId },
		include: { question: true },
	});
}

/**
 * Upsert survey answers for a user.
 */
export async function upsertSurveyAnswers(
	userId: string,
	answers: Array<{ questionId: string; value: string }>,
) {
	return prisma.$transaction(
		answers.map((a) =>
			prisma.surveyAnswer.upsert({
				where: {
					userId_questionId: { userId, questionId: a.questionId },
				},
				update: { value: a.value },
				create: { userId, questionId: a.questionId, value: a.value },
			}),
		),
	);
}

/**
 * Record ToS acceptance timestamp for a user.
 */
export async function acceptTos(userId: string) {
	return prisma.user.update({
		where: { id: userId },
		data: { tosAcceptedAt: new Date() },
	});
}
