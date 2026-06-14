import type { IlamyResourceCalendarProps } from "@ilamy/calendar";
import { useMemo } from "react";
import { formatDurationMin } from "@/shared/lib/tz-datetime";
import type { BreakEventData } from "../break-event-card";
import type { SessionEventData } from "../session-event-card";
import type { PlannerBreak, PlannerSession } from "../types";

type PlannerEvent = NonNullable<IlamyResourceCalendarProps["events"]>[number];

type RoomInput = { id: string; name: string; order: number };

export function usePlannerEvents(
	rooms: RoomInput[],
	sessions: PlannerSession[],
	breaks: PlannerBreak[],
) {
	const resources = useMemo(
		() => rooms.map((r) => ({ id: r.id, title: r.name, position: r.order })),
		[rooms],
	);

	const events = useMemo<PlannerEvent[]>(() => {
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
			data: { kind: "break" as const, breakId: b.id } satisfies BreakEventData,
		}));

		return [...sessionEvents, ...breakEvents];
	}, [sessions, breaks, rooms]);

	return { resources, events };
}
