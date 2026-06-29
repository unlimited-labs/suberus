import { prisma } from "@/shared/server/db.server";
import { isScheduleVisible } from "./schedule";

export interface PresentationDetailAuthor {
	firstName: string;
	lastName: string;
	affiliationName: string | null;
	isPresenter: boolean;
	orderIndex: number;
}

export interface PresentationDetail {
	content: string;
	keywords: string[];
	authors: PresentationDetailAuthor[];
}

export async function getFavoriteSlotIds(userId: string): Promise<string[]> {
	const rows = await prisma.presentationFavorite.findMany({
		where: { userId },
		select: { slotId: true },
	});
	return rows.map((r) => r.slotId);
}

export async function toggleFavorite(
	userId: string,
	slotId: string,
): Promise<boolean> {
	const existing = await prisma.presentationFavorite.findUnique({
		where: { slotId_userId: { slotId, userId } },
	});
	if (existing) {
		await prisma.presentationFavorite.delete({
			where: { slotId_userId: { slotId, userId } },
		});
		return false;
	}
	await prisma.presentationFavorite.create({ data: { slotId, userId } });
	return true;
}

export async function getPresentationDetail(
	slotId: string,
	viewerCanPreviewDraft = false,
): Promise<PresentationDetail | null> {
	if (!(await isScheduleVisible(viewerCanPreviewDraft))) return null;

	const slot = await prisma.presentationSlot.findUnique({
		where: { id: slotId },
		select: {
			submission: {
				select: {
					content: true,
					authors: {
						orderBy: { orderIndex: "asc" },
						select: {
							firstName: true,
							lastName: true,
							isPresenter: true,
							orderIndex: true,
							affiliation: { select: { name: true } },
						},
					},
					keywords: {
						select: { keyword: { select: { name: true } } },
					},
				},
			},
		},
	});
	if (!slot) return null;

	const { submission } = slot;
	return {
		content: submission.content,
		keywords: submission.keywords.map((k) => k.keyword.name),
		authors: submission.authors.map((a) => ({
			firstName: a.firstName,
			lastName: a.lastName,
			affiliationName: a.affiliation?.name ?? null,
			isPresenter: a.isPresenter,
			orderIndex: a.orderIndex,
		})),
	};
}
