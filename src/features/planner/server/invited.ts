import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/shared/server/db.server";
import { reserveSlotOrder } from "./presentations";
import { computeSessionUsage } from "./session-usage";

export interface InvitedSpeaker {
	firstName: string;
	lastName: string;
	affiliationId?: string | null;
	affiliationName: string;
	isPresenter: boolean;
}

export interface InvitedTalkFields {
	title: string;
	abstract?: string | null;
	speakers: InvitedSpeaker[];
}

export interface InvitedTalkDetail extends InvitedTalkFields {
	slotId: string;
	durationMin: number;
}

async function writeSpeakers(
	tx: Prisma.TransactionClient,
	submissionId: string,
	speakers: InvitedSpeaker[],
): Promise<void> {
	await tx.submissionAuthor.deleteMany({ where: { submissionId } });

	const rows = speakers.filter(
		(s) => s.firstName.trim() || s.lastName.trim() || s.affiliationName.trim(),
	);

	// Affiliations are upserted dedupe-by-name and sequentially to avoid an
	// intra-transaction race on the unique constraint (same pattern as
	// replaceSubmissionAuthors in submissions/server/submissions.ts).
	const uniqueAffiliationNames = Array.from(
		new Set(
			rows.flatMap((s) => {
				const name = s.affiliationId ? "" : s.affiliationName.trim();
				return name ? [name] : [];
			}),
		),
	);
	const affiliationIdByName = new Map<string, string>();
	for (const name of uniqueAffiliationNames) {
		const affiliation = await tx.affiliation.upsert({
			where: { name },
			update: {},
			create: { name },
		});
		affiliationIdByName.set(name, affiliation.id);
	}

	await Promise.all(
		rows.map((s, orderIndex) =>
			tx.submissionAuthor.create({
				data: {
					submissionId,
					firstName: s.firstName.trim(),
					lastName: s.lastName.trim(),
					// ponytail: invited speakers often have no address on file and the column
					// is non-nullable; INVITED never enters a flow that mails an author.
					email: "",
					affiliationId:
						s.affiliationId ??
						affiliationIdByName.get(s.affiliationName.trim()) ??
						null,
					orderIndex,
					isPresenter: s.isPresenter,
				},
			}),
		),
	);
}

export async function createInvitedTalk(
	data: InvitedTalkFields & { sessionId: string; durationMin: number },
	ownerId: string,
): Promise<{ id: string }> {
	return prisma.$transaction(async (tx) => {
		const order = await reserveSlotOrder(tx, data.sessionId, data.durationMin);
		const submission = await tx.submission.create({
			data: {
				type: "INVITED",
				status: "ACCEPTED",
				userId: ownerId,
				title: data.title.trim(),
				content: data.abstract?.trim() ?? "",
			},
			select: { id: true },
		});
		await writeSpeakers(tx, submission.id, data.speakers);
		return tx.presentationSlot.create({
			data: {
				sessionId: data.sessionId,
				submissionId: submission.id,
				order,
				durationMin: data.durationMin,
			},
			select: { id: true },
		});
	});
}

export async function updateInvitedTalk(
	slotId: string,
	fields: InvitedTalkFields & { durationMin?: number },
): Promise<void> {
	await prisma.$transaction(async (tx) => {
		const slot = await tx.presentationSlot.findUnique({
			where: { id: slotId },
			select: {
				submissionId: true,
				durationMin: true,
				submission: { select: { type: true } },
				session: {
					select: {
						startAt: true,
						endAt: true,
						untimedSlots: true,
						presentations: { select: { id: true, durationMin: true } },
					},
				},
			},
		});
		if (!slot) throw new Error("Presentation not found");
		if (slot.submission.type !== "INVITED") {
			throw new Error("Only invited talks can be edited here");
		}

		const { durationMin } = fields;
		if (durationMin !== undefined && durationMin !== slot.durationMin) {
			if (!slot.session.untimedSlots) {
				const { sessionMin, usedMin: usedOthers } = computeSessionUsage(
					slot.session,
					{ excludePresentationId: slotId },
				);
				if (usedOthers + durationMin > sessionMin) {
					throw new Error(
						`Session is full: other presentations use ${usedOthers}/${sessionMin} min`,
					);
				}
			}
			await tx.presentationSlot.update({
				where: { id: slotId },
				data: { durationMin },
			});
		}

		await tx.submission.update({
			where: { id: slot.submissionId },
			data: {
				title: fields.title.trim(),
				content: fields.abstract?.trim() ?? "",
			},
		});
		await writeSpeakers(tx, slot.submissionId, fields.speakers);
	});
}

export async function getInvitedTalk(
	slotId: string,
): Promise<InvitedTalkDetail | null> {
	const slot = await prisma.presentationSlot.findUnique({
		where: { id: slotId },
		select: {
			id: true,
			durationMin: true,
			submission: {
				select: {
					type: true,
					title: true,
					content: true,
					authors: {
						orderBy: { orderIndex: "asc" },
						select: {
							firstName: true,
							lastName: true,
							isPresenter: true,
							affiliation: { select: { id: true, name: true } },
						},
					},
				},
			},
		},
	});
	if (slot?.submission.type !== "INVITED") return null;
	return {
		slotId: slot.id,
		durationMin: slot.durationMin,
		title: slot.submission.title,
		abstract: slot.submission.content,
		speakers: slot.submission.authors.map((a) => ({
			firstName: a.firstName,
			lastName: a.lastName,
			affiliationId: a.affiliation?.id ?? null,
			affiliationName: a.affiliation?.name ?? "",
			isPresenter: a.isPresenter,
		})),
	};
}
