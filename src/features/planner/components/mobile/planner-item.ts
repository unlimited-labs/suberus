import { compareAsc } from "date-fns";
import type { SessionEventData } from "../session-event-card";
import type { PlannerBreak, PlannerSession } from "../types";

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
	itemKind: "break" | "event";
	id: string;
	startAt: Date;
	endAt: Date;
	title: string;
	description: string | null;
	location: string | null;
	roomName: string | null;
};

export type PlannerItem = SessionItem | BreakItem;

export function buildPlannerItems(
	sessions: PlannerSession[],
	breaks: PlannerBreak[],
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
		itemKind: x.kind === "EVENT" ? "event" : "break",
		id: x.id,
		startAt: new Date(x.startAt),
		endAt: new Date(x.endAt),
		title: x.title,
		description: x.description ?? null,
		location: x.location ?? null,
		roomName: x.room?.name ?? null,
	}));
	return [...s, ...b].sort((a, b) => compareAsc(a.startAt, b.startAt));
}
