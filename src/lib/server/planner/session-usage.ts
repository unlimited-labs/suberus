export interface SessionWindow {
	startAt: Date;
	endAt: Date;
}

export interface PresentationDuration {
	id?: string;
	durationMin: number;
}

export interface SessionUsage {
	sessionMin: number;
	usedMin: number;
	freeMin: number;
}

export function computeSessionUsage(
	session: SessionWindow & { presentations: PresentationDuration[] },
	opts?: { excludePresentationId?: string },
): SessionUsage {
	const sessionMin = Math.round(
		(session.endAt.getTime() - session.startAt.getTime()) / 60_000,
	);
	const usedMin = session.presentations.reduce((sum, p) => {
		if (opts?.excludePresentationId && p.id === opts.excludePresentationId) {
			return sum;
		}
		return sum + p.durationMin;
	}, 0);
	const freeMin = Math.max(0, sessionMin - usedMin);
	return { sessionMin, usedMin, freeMin };
}

export function freeSlotsFor(freeMin: number, slotMin: number): number {
	if (slotMin <= 0) return 0;
	return Math.floor(freeMin / slotMin);
}
