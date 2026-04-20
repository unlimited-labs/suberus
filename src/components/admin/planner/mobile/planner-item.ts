import type { SessionEventData } from "../session-event-card";

export type SessionItem = {
	kind: "session";
	id: string;
	startAt: Date;
	endAt: Date;
	title: string;
	roomName: string | null;
	trackColor: string | null;
	trackName: string | null;
	chairs: SessionEventData["chairs"];
	presentationCount: number;
};

export type BreakItem = {
	kind: "break";
	id: string;
	startAt: Date;
	endAt: Date;
	title: string;
	roomName: string | null;
};

export type PlannerItem = SessionItem | BreakItem;

type RawSession = {
	id: string;
	title: string;
	startAt: string | Date;
	endAt: string | Date;
	room: { name: string } | null;
	track: { name: string; color: string | null } | null;
	chairs: Array<{ firstName: string | null; lastName: string | null }>;
	presentations: unknown[];
};

type RawBreak = {
	id: string;
	title: string;
	startAt: string | Date;
	endAt: string | Date;
	room: { name: string } | null;
};

export function buildPlannerItems(
	sessions: RawSession[],
	breaks: RawBreak[],
): PlannerItem[] {
	const s: PlannerItem[] = sessions.map((x) => ({
		kind: "session",
		id: x.id,
		startAt: new Date(x.startAt),
		endAt: new Date(x.endAt),
		title: x.title,
		roomName: x.room?.name ?? null,
		trackColor: x.track?.color ?? null,
		trackName: x.track?.name ?? null,
		chairs: x.chairs.map((c) => ({
			firstName: c.firstName ?? "",
			lastName: c.lastName ?? "",
		})),
		presentationCount: x.presentations.length,
	}));
	const b: PlannerItem[] = breaks.map((x) => ({
		kind: "break",
		id: x.id,
		startAt: new Date(x.startAt),
		endAt: new Date(x.endAt),
		title: x.title,
		roomName: x.room?.name ?? null,
	}));
	return [...s, ...b].sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
}
