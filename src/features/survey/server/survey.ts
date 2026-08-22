import { getSurveyTemplate } from "@/features/survey/templates";
import type { SurveyQuestion } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";
import type {
	SurveyAudience,
	SurveyQuestionType,
} from "@/generated/prisma/enums";
import { prisma } from "@/shared/server/db.server";

/**
 * Audiences a viewer is allowed to see. Exhibitors (role EXHIBITOR) see ALL +
 * EXHIBITORS; everyone else — authors, staff, and guests at registration — sees
 * ALL + PARTICIPANTS. (Users become exhibitors via self-service after sign-up.)
 */
export function visibleAudiences(role?: string | null): SurveyAudience[] {
	return role === "EXHIBITOR" ? ["ALL", "EXHIBITORS"] : ["ALL", "PARTICIPANTS"];
}

type TypedSurveyQuestion = Omit<SurveyQuestion, "options"> & {
	options: string[] | null;
};

function typeSurveyQuestion(q: SurveyQuestion): TypedSurveyQuestion {
	// SAFETY: survey options are written as a string array by the question editor.
	return { ...q, options: q.options as string[] | null };
}

export async function getSurveyQuestions(
	activeOnly = false,
	audiences?: SurveyAudience[],
) {
	const questions = await prisma.surveyQuestion.findMany({
		where: {
			...(activeOnly && { isActive: true }),
			...(audiences && { audience: { in: audiences } }),
		},
		orderBy: { orderIndex: "asc" },
	});
	return questions.map(typeSurveyQuestion);
}

export async function createSurveyQuestion(
	label: string,
	orderIndex: number,
	type?: SurveyQuestionType,
	options?: string[],
	allowOther?: boolean,
	isRequired?: boolean,
	showInUsersList?: boolean,
	fieldName?: string | null,
	audience?: SurveyAudience,
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
			...(audience && { audience }),
		},
	});
	return typeSurveyQuestion(created);
}

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
		audience?: SurveyAudience;
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

export async function deleteSurveyQuestion(id: string) {
	return prisma.$transaction([
		prisma.surveyAnswer.deleteMany({ where: { questionId: id } }),
		prisma.surveyQuestion.delete({ where: { id } }),
	]);
}

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

export async function getUserSurveyAnswers(userId: string) {
	return prisma.surveyAnswer.findMany({
		where: { userId },
		include: { question: true },
	});
}

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

export async function acceptTos(userId: string) {
	return prisma.user.update({
		where: { id: userId },
		data: { tosAcceptedAt: new Date() },
	});
}
