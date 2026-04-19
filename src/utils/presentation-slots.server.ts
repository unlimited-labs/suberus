import { prisma } from "@/db.server";

export async function createSlot(data: {
	sessionId: string;
	submissionId: string;
	durationMin: number;
}): Promise<{ id: string }> {
	return prisma.$transaction(async (tx) => {
		const session = await tx.programSession.findUnique({
			where: { id: data.sessionId },
			select: {
				startAt: true,
				endAt: true,
				presentations: { select: { durationMin: true } },
			},
		});
		if (!session) throw new Error("Session not found");

		const sessionDurationMin = Math.round(
			(session.endAt.getTime() - session.startAt.getTime()) / 60_000,
		);
		const usedMin = session.presentations.reduce(
			(sum, p) => sum + p.durationMin,
			0,
		);
		if (usedMin + data.durationMin > sessionDurationMin) {
			throw new Error(
				`Session is full: ${usedMin}/${sessionDurationMin} min used, cannot add ${data.durationMin} min`,
			);
		}

		const last = await tx.presentationSlot.findFirst({
			where: { sessionId: data.sessionId },
			orderBy: { order: "desc" },
			select: { order: true },
		});
		const nextOrder = (last?.order ?? -1) + 1;
		const slot = await tx.presentationSlot.create({
			data: {
				sessionId: data.sessionId,
				submissionId: data.submissionId,
				order: nextOrder,
				durationMin: data.durationMin,
			},
			select: { id: true },
		});
		return slot;
	});
}

export async function deleteSlot(id: string): Promise<void> {
	const slot = await prisma.presentationSlot.findUnique({
		where: { id },
		select: { sessionId: true, order: true },
	});
	if (!slot) return;

	await prisma.$transaction(async (tx) => {
		await tx.presentationSlot.delete({ where: { id } });
		// Close gap: shift higher orders down by 1.
		await tx.$executeRaw`
			UPDATE presentation_slots
			SET "order" = "order" - 1
			WHERE "sessionId" = ${slot.sessionId}::uuid AND "order" > ${slot.order}
		`;
	});
}

/**
 * Reorder slots within a single session. `orderedIds` must contain every slot
 * in the session exactly once; new `order` = index in array.
 */
export async function reorderSlots(
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
			if (!existingSet.has(id)) throw new Error(`Slot ${id} not in session`);
		}

		// Two-phase: shift to negative to avoid @@unique(sessionId, order) collisions.
		for (const [idx, id] of orderedIds.entries()) {
			await tx.presentationSlot.update({
				where: { id },
				data: { order: -(idx + 1) },
			});
		}
		for (const [idx, id] of orderedIds.entries()) {
			await tx.presentationSlot.update({
				where: { id },
				data: { order: idx },
			});
		}
	});
}
