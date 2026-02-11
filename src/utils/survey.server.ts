import { prisma } from "@/db.server";

/**
 * Get survey questions, optionally filtered by active status.
 */
export async function getSurveyQuestions(activeOnly = false) {
	return prisma.surveyQuestion.findMany({
		where: activeOnly ? { isActive: true } : undefined,
		orderBy: { orderIndex: "asc" },
	});
}

/**
 * Create a new survey question.
 */
export async function createSurveyQuestion(label: string, orderIndex: number) {
	return prisma.surveyQuestion.create({
		data: { label, orderIndex },
	});
}

/**
 * Update a survey question (partial).
 */
export async function updateSurveyQuestion(
	id: string,
	data: { label?: string; orderIndex?: number; isActive?: boolean },
) {
	return prisma.surveyQuestion.update({ where: { id }, data });
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
	answers: Array<{ questionId: string; value: boolean }>,
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
