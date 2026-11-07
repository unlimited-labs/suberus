export interface SlotTiming {
	order: number;
	durationMin: number;
}

export function slotStartAt(
	sessionStartAt: Date,
	sessionSlots: SlotTiming[],
	slotOrder: number,
): Date {
	const offsetMin = sessionSlots
		.filter((s) => s.order < slotOrder)
		.reduce((sum, s) => sum + s.durationMin, 0);
	return new Date(sessionStartAt.getTime() + offsetMin * 60_000);
}

export function isReminderDue(
	startMs: number,
	nowMs: number,
	leadMin: number,
): boolean {
	return startMs - leadMin * 60_000 <= nowMs && nowMs < startMs;
}
