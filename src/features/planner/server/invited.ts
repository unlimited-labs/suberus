import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/shared/server/db.server";
import { reserveSlotOrder } from "./presentations";
import { computeSessionUsage } from "./session-usage";

export interface InvitedTalkFields {
	title: string;
	abstract?: string | null;
	speakerFirstName?: string | null;
	speakerLastName?: string | null;
	affiliationName?: string | null;
}

export interface InvitedTalkDetail extends InvitedTalkFields {
	slotId: string;
	durationMin: number;
}

async function resolveAffiliationId(
	tx: Prisma.TransactionClient,
	name: string | null | undefined,
): Promise<string | null> {
	const trimmed = name?.trim();
	if (!trimmed) return null;
	const affiliation = await tx.affiliation.upsert({
		where: { name: trimmed },
		update: {},
		create: { name: trimmed },
	});
	return affiliation.id;
}

/**
 * Replace the placeholder's single speaker row. `presenterId` must be cleared
 * before the delete because it FKs into submission_authors.
 */
async function writeSpeaker(
	tx: Prisma.TransactionClient,
	submissionId: string,
	fields: InvitedTalkFields,
): Promise<void> {
	await tx.submission.update({
		where: { id: submissionId },
		data: { presenterId: null },
	});
	await tx.submissionAuthor.deleteMany({ where: { submissionId } });

	const firstName = fields.speakerFirstName?.trim() ?? "";
	const lastName = fields.speakerLastName?.trim() ?? "";
	if (!firstName && !lastName) return;

	const author = await tx.submissionAuthor.create({
		data: {
			submissionId,
			firstName,
			lastName,
			// ponytail: invited speakers often have no address on file and the column
			// is non-nullable; INVITED never enters a flow that mails an author.
			email: "",
			affiliationId: await resolveAffiliationId(tx, fields.affiliationName),
			orderIndex: 0,
			isPresenter: true,
		},
		select: { id: true },
	});
	await tx.submission.update({
		where: { id: submissionId },
		data: { presenterId: author.id },
	});
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
		await writeSpeaker(tx, submission.id, data);
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

/** Title, speaker and duration move together so a rejected duration cannot
 * leave the other fields half-saved. */
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
		await writeSpeaker(tx, slot.submissionId, fields);
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
						take: 1,
						select: {
							firstName: true,
							lastName: true,
							affiliation: { select: { name: true } },
						},
					},
				},
			},
		},
	});
	if (slot?.submission.type !== "INVITED") return null;
	const speaker = slot.submission.authors[0];
	return {
		slotId: slot.id,
		durationMin: slot.durationMin,
		title: slot.submission.title,
		abstract: slot.submission.content,
		speakerFirstName: speaker?.firstName ?? "",
		speakerLastName: speaker?.lastName ?? "",
		affiliationName: speaker?.affiliation?.name ?? "",
	};
}
