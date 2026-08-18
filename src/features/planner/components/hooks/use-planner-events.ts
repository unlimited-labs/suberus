import type { IlamyCalendarProps } from "@ilamy/calendar";
import { formatDurationMin } from "@/features/planner/tz-datetime";
import type { BreakEventData } from "../break-event-card";
import type { SessionEventData } from "../session-event-card";
import type { PlannerBreak, PlannerSession } from "../types";

type PlannerEvent = NonNullable<IlamyCalendarProps["events"]>[number];

type RoomInput = { id: string; name: string; order: number };

export function usePlannerEvents(
	rooms: RoomInput[],
	sessions: PlannerSession[],
	breaks: PlannerBreak[],
) {
	const resources = rooms.map((r) => ({ id: r.id, title: r.name }));

	const sessionEvents = sessions.map((s) => ({
		id: `session:${s.id}`,
		title: s.title,
		start: s.startAt,
		end: s.endAt,
		resourceId: s.roomId ?? undefined,
		backgroundColor: "transparent",
		data: {
			kind: "session" as const,
			sessionId: s.id,
			trackColor: s.track?.color ?? null,
			trackName: s.track?.name ?? null,
			sessionDurationMin: formatDurationMin(
				new Date(s.startAt),
				new Date(s.endAt),
			),
			chairs: s.chairs.map((c) => ({
				firstName: c.firstName,
				lastName: c.lastName,
			})),
			presentations: s.presentations.map((p) => ({
				id: p.id,
				submissionTitle: p.submissionTitle,
				durationMin: p.durationMin,
			})),
		} satisfies SessionEventData,
	}));

	const allRoomIds = rooms.map((r) => r.id);
	const breakEvents = breaks.map((b) => ({
		id: `break:${b.id}`,
		title: b.title,
		start: b.startAt,
		end: b.endAt,
		resourceId: b.roomId ?? undefined,
		resourceIds: b.roomId ? undefined : allRoomIds,
		backgroundColor: "transparent",
		data: {
			kind: "break" as const,
			breakId: b.id,
			itemKind: b.kind === "EVENT" ? ("event" as const) : ("break" as const),
		} satisfies BreakEventData,
	}));

	const events: PlannerEvent[] = [...sessionEvents, ...breakEvents];

	return { resources, events };
}
