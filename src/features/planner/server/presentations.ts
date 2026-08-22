import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/shared/server/db.server";
import { getPlannerIncludedTypes } from "./included-types";
import { computeSessionUsage } from "./session-usage";

export async function reserveSlotOrder(
	tx: Prisma.TransactionClient,
	sessionId: string,
	durationMin: number,
): Promise<number> {
	const session = await tx.programSession.findUnique({
		where: { id: sessionId },
		select: {
			startAt: true,
			endAt: true,
			untimedSlots: true,
			presentations: { select: { durationMin: true } },
		},
	});
	if (!session) throw new Error("Session not found");

	if (!session.untimedSlots) {
		const { sessionMin, usedMin } = computeSessionUsage(session);
		if (usedMin + durationMin > sessionMin) {
			throw new Error(
				`Session is full: ${usedMin}/${sessionMin} min used, cannot add ${durationMin} min`,
			);
		}
	}

	const last = await tx.presentationSlot.findFirst({
		where: { sessionId },
		orderBy: { order: "desc" },
		select: { order: true },
	});
	return (last?.order ?? -1) + 1;
}

export async function createPresentation(data: {
	sessionId: string;
	submissionId: string;
	durationMin: number;
}): Promise<{ id: string }> {
	const includedTypes = await getPlannerIncludedTypes();
	return prisma.$transaction(async (tx) => {
		const submission = await tx.submission.findFirst({
			where: {
				id: data.submissionId,
				status: { in: ["ACCEPTED", "CONDITIONALLY_ACCEPTED"] },
				type: { in: includedTypes },
			},
			select: { id: true },
		});
		if (!submission) {
			throw new Error("Submission is not accepted or not presentable");
		}

		const nextOrder = await reserveSlotOrder(
			tx,
			data.sessionId,
			data.durationMin,
		);
		const presentation = await tx.presentationSlot.create({
			data: {
				sessionId: data.sessionId,
				submissionId: data.submissionId,
				order: nextOrder,
				durationMin: data.durationMin,
			},
			select: { id: true },
		});
		return presentation;
	});
}

export async function updatePresentationDuration(
	id: string,
	durationMin: number,
): Promise<void> {
	await prisma.$transaction(async (tx) => {
		const presentation = await tx.presentationSlot.findUnique({
			where: { id },
			select: {
				sessionId: true,
				durationMin: true,
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
		if (!presentation) throw new Error("Presentation not found");

		if (!presentation.session.untimedSlots) {
			const { sessionMin, usedMin: usedOthers } = computeSessionUsage(
				presentation.session,
				{ excludePresentationId: id },
			);
			if (usedOthers + durationMin > sessionMin) {
				throw new Error(
					`Session is full: other presentations use ${usedOthers}/${sessionMin} min`,
				);
			}
		}
		await tx.presentationSlot.update({
			where: { id },
			data: { durationMin },
		});
	});
}

export async function setPresentationCancelled(
	id: string,
	cancelled: boolean,
): Promise<void> {
	await prisma.presentationSlot.update({ where: { id }, data: { cancelled } });
}

/** An INVITED placeholder exists only to back its slot, so it dies with it. */
export async function deletePresentation(id: string): Promise<void> {
	const presentation = await prisma.presentationSlot.findUnique({
		where: { id },
		select: {
			sessionId: true,
			order: true,
			submissionId: true,
			submission: { select: { type: true } },
		},
	});
	if (!presentation) return;

	await prisma.$transaction(async (tx) => {
		await tx.presentationSlot.delete({ where: { id } });
		await tx.$executeRaw`
			UPDATE presentation_slots
			SET "order" = "order" - 1
			WHERE "sessionId" = ${presentation.sessionId}::uuid AND "order" > ${presentation.order}
		`;
		if (presentation.submission.type === "INVITED") {
			await tx.submission.delete({ where: { id: presentation.submissionId } });
		}
	});
}

export async function reorderPresentations(
	sessionId: string,
	orderedIds: string[],
): Promise<void> {
	await prisma.$transaction(async (tx) => {
		const existing = await tx.presentationSlot.findMany({
			where: { sessionId },
			select: { id: true },
		});
		if (existing.length !== orderedIds.length) {
			throw new Error("Ordered IDs length mismatch");
		}
		const existingSet = new Set(existing.map((s) => s.id));
		for (const id of orderedIds) {
			if (!existingSet.has(id)) {
				throw new Error(`Presentation ${id} not in session`);
			}
		}

		// Two-phase: shift to negative to avoid @@unique(sessionId, order) collisions.
		await Promise.all(
			orderedIds.map((id, idx) =>
				tx.presentationSlot.update({
					where: { id },
					data: { order: -(idx + 1) },
				}),
			),
		);
		await Promise.all(
			orderedIds.map((id, idx) =>
				tx.presentationSlot.update({ where: { id }, data: { order: idx } }),
			),
		);
	});
}
