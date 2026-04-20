import type { IlamyResourceCalendarProps } from "@ilamy/calendar";
import { useMemo } from "react";

type PlannerEvent = NonNullable<IlamyResourceCalendarProps["events"]>[number];

import type { BreakEventData } from "@/components/admin/planner/break-event-card";
import type { SessionEventData } from "@/components/admin/planner/session-event-card";

type SessionInput = {
	id: string;
	title: string;
	startAt: string | Date;
	endAt: string | Date;
	roomId: string | null;
	track: { name: string; color: string | null } | null;
	chairs: Array<{ firstName: string | null; lastName: string | null }>;
	presentations: Array<{
		id: string;
		submissionTitle: string;
		durationMin: number;
	}>;
};

type BreakInput = {
	id: string;
	title: string;
	startAt: string | Date;
	endAt: string | Date;
	roomId: string | null;
};

type RoomInput = { id: string; name: string; order: number };

export function usePlannerEvents(
	rooms: RoomInput[],
	sessions: SessionInput[],
	breaks: BreakInput[],
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
				sessionDurationMin: Math.round(
					(new Date(s.endAt).getTime() - new Date(s.startAt).getTime()) /
						60_000,
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

		const breakEvents = breaks.map((b) => ({
			id: `break:${b.id}`,
			title: b.title,
			start: b.startAt,
			end: b.endAt,
			resourceId: b.roomId ?? undefined,
			backgroundColor: "transparent",
			data: { kind: "break" as const, breakId: b.id } satisfies BreakEventData,
		}));

		return [...sessionEvents, ...breakEvents];
	}, [sessions, breaks]);

	return { resources, events };
}
