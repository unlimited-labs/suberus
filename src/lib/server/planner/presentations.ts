import { prisma } from "@/db.server";
import { computeSessionUsage } from "./session-usage";

export async function createPresentation(data: {
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

		const { sessionMin, usedMin } = computeSessionUsage(session);
		if (usedMin + data.durationMin > sessionMin) {
			throw new Error(
				`Session is full: ${usedMin}/${sessionMin} min used, cannot add ${data.durationMin} min`,
			);
		}

		const last = await tx.presentationSlot.findFirst({
			where: { sessionId: data.sessionId },
			orderBy: { order: "desc" },
			select: { order: true },
		});
		const nextOrder = (last?.order ?? -1) + 1;
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
						presentations: { select: { id: true, durationMin: true } },
					},
				},
			},
		});
		if (!presentation) throw new Error("Presentation not found");

		const { sessionMin, usedMin: usedOthers } = computeSessionUsage(
			presentation.session,
			{ excludePresentationId: id },
		);
		if (usedOthers + durationMin > sessionMin) {
			throw new Error(
				`Session is full: other presentations use ${usedOthers}/${sessionMin} min`,
			);
		}
		await tx.presentationSlot.update({
			where: { id },
			data: { durationMin },
		});
	});
}

export async function deletePresentation(id: string): Promise<void> {
	const presentation = await prisma.presentationSlot.findUnique({
		where: { id },
		select: { sessionId: true, order: true },
	});
	if (!presentation) return;

	await prisma.$transaction(async (tx) => {
		await tx.presentationSlot.delete({ where: { id } });
		// Close gap: shift higher orders down by 1.
		await tx.$executeRaw`
			UPDATE presentation_slots
			SET "order" = "order" - 1
			WHERE "sessionId" = ${presentation.sessionId}::uuid AND "order" > ${presentation.order}
		`;
	});
}

/**
 * Reorder presentations within a single session. `orderedIds` must contain
 * every presentation in the session exactly once; new `order` = index in array.
 */
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
