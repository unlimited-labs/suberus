import { getSetting } from "@/features/settings/server/settings";
import { prisma } from "@/shared/server/db.server";
import { isScheduleVisible } from "./schedule";

export interface PresentationDetailAuthor {
	firstName: string;
	lastName: string;
	affiliationName: string | null;
	isPresenter: boolean;
	orderIndex: number;
	orcid: string | null;
	email: string | null;
}

export interface PresentationDetail {
	content: string;
	keywords: string[];
	authors: PresentationDetailAuthor[];
	cameraReadyUrl: string | null;
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

export async function isParticipant(userId: string): Promise<boolean> {
	const fee = await prisma.fee.findUnique({
		where: { userId },
		select: { paid: true },
	});
	return fee?.paid === true;
}

export async function getPresentationDetail(
	slotId: string,
	viewerCanPreviewDraft = false,
	viewerIsParticipant = false,
): Promise<PresentationDetail | null> {
	if (!(await isScheduleVisible(viewerCanPreviewDraft))) return null;

	const [showAuthorInfo, slot] = await Promise.all([
		getSetting("PROGRAM_SHOW_AUTHOR_INFO"),
		prisma.presentationSlot.findUnique({
			where: { id: slotId },
			select: {
				submission: {
					select: {
						content: true,
						cameraReadyFileId: true,
						authors: {
							orderBy: { orderIndex: "asc" },
							select: {
								firstName: true,
								email: true,
								lastName: true,
								isPresenter: true,
								orderIndex: true,
								affiliation: { select: { name: true } },
								user: { select: { orcid: true, contactConsent: true } },
							},
						},
						keywords: {
							select: { keyword: { select: { name: true } } },
						},
					},
				},
			},
		}),
	]);
	if (!slot) return null;

	const includeAuthorInfo = showAuthorInfo && viewerIsParticipant;
	const { submission } = slot;
	return {
		content: submission.content,
		cameraReadyUrl: submission.cameraReadyFileId
			? `/api/program/camera-ready/${slotId}`
			: null,
		keywords: submission.keywords.map((k) => k.keyword.name),
		authors: submission.authors.map((a) => {
			const consented = includeAuthorInfo && a.user?.contactConsent === true;
			return {
				firstName: a.firstName,
				lastName: a.lastName,
				affiliationName: a.affiliation?.name ?? null,
				isPresenter: a.isPresenter,
				orderIndex: a.orderIndex,
				orcid: consented ? (a.user?.orcid ?? null) : null,
				email: consented ? a.email : null,
			};
		}),
	};
}
