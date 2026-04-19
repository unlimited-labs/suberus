import { IlamyResourceCalendar, type WeekDays } from "@ilamy/calendar";
import { IconCalendar } from "@tabler/icons-react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import {
	BreakEventCard,
	type BreakEventData,
} from "@/components/admin/planner/break-event-card";
import {
	SessionEventCard,
	type SessionEventData,
} from "@/components/admin/planner/session-event-card";
import { PageHeader } from "@/components/layout/page-header";
import {
	allSessionsQueryOptions,
	moveSessionFn,
} from "@/utils/program-sessions.functions";
import { allRoomsQueryOptions } from "@/utils/rooms.functions";
import {
	allBreaksQueryOptions,
	updateBreakFn,
} from "@/utils/schedule-breaks.functions";
import { conferenceSettingsQueryOptions } from "@/utils/settings.functions";

export const Route = createFileRoute("/_app/admin/_layout/program-planner/")({
	loader: async ({ context }) => {
		await Promise.all([
			context.queryClient.ensureQueryData(allRoomsQueryOptions()),
			context.queryClient.ensureQueryData(allSessionsQueryOptions()),
			context.queryClient.ensureQueryData(allBreaksQueryOptions()),
			context.queryClient.ensureQueryData(conferenceSettingsQueryOptions()),
		]);
	},
	component: ProgramPlannerPage,
});

function ProgramPlannerPage() {
	const queryClient = useQueryClient();
	const { data: rooms } = useSuspenseQuery(allRoomsQueryOptions());
	const { data: sessions } = useSuspenseQuery(allSessionsQueryOptions());
	const { data: breaks } = useSuspenseQuery(allBreaksQueryOptions());
	const { data: settings } = useSuspenseQuery(conferenceSettingsQueryOptions());

	const resources = rooms.map((r) => ({
		id: r.id,
		title: r.name,
		position: r.order,
	}));

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

	const events = [...sessionEvents, ...breakEvents];

	const invalidate = () => {
		queryClient.invalidateQueries({
			queryKey: allSessionsQueryOptions().queryKey,
		});
		queryClient.invalidateQueries({
			queryKey: allBreaksQueryOptions().queryKey,
		});
	};

	const handleEventUpdate = async (event: {
		id: string | number;
		start: { toDate: () => Date };
		end: { toDate: () => Date };
		resourceId?: string | number;
		data?: { kind?: "session" | "break"; sessionId?: string; breakId?: string };
	}) => {
		const kind = event.data?.kind;
		const roomId =
			typeof event.resourceId === "string" ? event.resourceId : null;
		const startAt = event.start.toDate().toISOString();
		const endAt = event.end.toDate().toISOString();

		try {
			if (kind === "session" && event.data?.sessionId) {
				await moveSessionFn({
					data: { id: event.data.sessionId, startAt, endAt, roomId },
				});
			} else if (kind === "break" && event.data?.breakId) {
				await updateBreakFn({
					data: { id: event.data.breakId, startAt, endAt, roomId },
				});
			}
			invalidate();
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Failed to update";
			toast.error(message);
		}
	};

	const initialDate = settings.conferenceStartDate
		? new Date(settings.conferenceStartDate)
		: undefined;

	const parseHour = (v: string, fallback: number) => {
		const m = v?.match(/^(\d{1,2}):(\d{2})$/);
		if (!m) return fallback;
		return Number(m[1]) + Number(m[2]) / 60;
	};
	const allDays: WeekDays[] = [
		"sunday",
		"monday",
		"tuesday",
		"wednesday",
		"thursday",
		"friday",
		"saturday",
	];
	const businessHours = {
		daysOfWeek: allDays,
		startTime: parseHour(settings.dayStart, 9),
		endTime: parseHour(settings.dayEnd, 18),
	};

	if (rooms.length === 0) {
		return (
			<div className="flex h-full flex-col">
				<PageHeader icon={IconCalendar} title="Program Planner" />
				<div className="flex flex-1 items-center justify-center p-8">
					<div className="max-w-md rounded-md border border-dashed p-8 text-center">
						<p className="text-sm text-muted-foreground">
							No rooms configured. Add rooms in Settings → Program before using
							the planner.
						</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconCalendar} title="Program Planner" />
			<div className="flex-1 overflow-hidden p-4">
				<IlamyResourceCalendar
					resources={resources}
					events={events}
					orientation="vertical"
					initialView="day"
					initialDate={initialDate}
					timezone={settings.timezone || undefined}
					timeFormat={settings.timeFormat === "12h" ? "12-hour" : "24-hour"}
					businessHours={businessHours}
					hideNonBusinessHours
					onEventUpdate={handleEventUpdate}
					renderEvent={(event) => {
						const data = event.data as
							| SessionEventData
							| BreakEventData
							| undefined;
						if (data?.kind === "break") {
							return <BreakEventCard title={event.title} />;
						}
						if (data?.kind === "session") {
							return <SessionEventCard title={event.title} data={data} />;
						}
						return null;
					}}
				/>
			</div>
		</div>
	);
}
