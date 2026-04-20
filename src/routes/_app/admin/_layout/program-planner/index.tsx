import {
	type CalendarEvent,
	IlamyResourceCalendar,
	type WeekDays,
} from "@ilamy/calendar";
import { IconAlertTriangle, IconCalendar } from "@tabler/icons-react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { BreakEditorSheet } from "@/components/admin/planner/break-editor-sheet";
import {
	BreakEventCard,
	type BreakEventData,
} from "@/components/admin/planner/break-event-card";
import { CapacityStrip } from "@/components/admin/planner/capacity-strip";
import { CreateEventDialog } from "@/components/admin/planner/create-event-dialog";
import { CreateSessionDialog } from "@/components/admin/planner/create-session-dialog";
import { IssuesPanel } from "@/components/admin/planner/issues-panel";
import { MobilePlanner } from "@/components/admin/planner/mobile-planner";
import { PublishButton } from "@/components/admin/planner/publish-button";
import { SessionEditorSheet } from "@/components/admin/planner/session-editor-sheet";
import {
	SessionEventCard,
	type SessionEventData,
} from "@/components/admin/planner/session-event-card";
import { UnscheduledSidebar } from "@/components/admin/planner/unscheduled-sidebar";
import { PageHeader } from "@/components/layout/page-header";
import { createSlotFn } from "@/utils/presentation-slots.functions";
import {
	allSessionsQueryOptions,
	moveSessionFn,
	unscheduledSubmissionsQueryOptions,
} from "@/utils/program-sessions.functions";
import { allProgramTracksQueryOptions } from "@/utils/program-tracks.functions";
import { allRoomsQueryOptions } from "@/utils/rooms.functions";
import {
	scheduleCapacityQueryOptions,
	scheduleStateQueryOptions,
} from "@/utils/schedule.functions";
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
			context.queryClient.ensureQueryData(allProgramTracksQueryOptions()),
			context.queryClient.ensureQueryData(unscheduledSubmissionsQueryOptions()),
			context.queryClient.ensureQueryData(scheduleStateQueryOptions()),
			context.queryClient.ensureQueryData(scheduleCapacityQueryOptions()),
		]);
	},
	component: ProgramPlannerPage,
});

type SelectedEvent =
	| { kind: "session"; id: string }
	| { kind: "break"; id: string }
	| null;

function ProgramPlannerPage() {
	const queryClient = useQueryClient();
	const { data: rooms } = useSuspenseQuery(allRoomsQueryOptions());
	const { data: sessions } = useSuspenseQuery(allSessionsQueryOptions());
	const { data: breaks } = useSuspenseQuery(allBreaksQueryOptions());
	const { data: settings } = useSuspenseQuery(conferenceSettingsQueryOptions());

	const [selectedEvent, setSelectedEvent] = useState<SelectedEvent>(null);
	const [currentDate, setCurrentDate] = useState<Date | null>(null);
	const [calendarKey, setCalendarKey] = useState(0);
	const [selectionDialog, setSelectionDialog] = useState<{
		submissionIds: string[];
	} | null>(null);
	const [mobileQueueOpen, setMobileQueueOpen] = useState(false);

	const confStart = settings.conferenceStartDate
		? new Date(settings.conferenceStartDate)
		: null;
	const confEnd = settings.conferenceEndDate
		? new Date(settings.conferenceEndDate)
		: null;
	const isOutsideRange =
		currentDate !== null &&
		confStart !== null &&
		confEnd !== null &&
		(currentDate < confStart || currentDate > confEnd);

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
			sessionDurationMin: Math.round(
				(new Date(s.endAt).getTime() - new Date(s.startAt).getTime()) / 60_000,
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

	const events = [...sessionEvents, ...breakEvents];

	const invalidate = () => {
		queryClient.invalidateQueries({
			queryKey: allSessionsQueryOptions().queryKey,
		});
		queryClient.invalidateQueries({
			queryKey: allBreaksQueryOptions().queryKey,
		});
		queryClient.invalidateQueries({
			queryKey: unscheduledSubmissionsQueryOptions().queryKey,
		});
		queryClient.invalidateQueries({
			queryKey: scheduleCapacityQueryOptions().queryKey,
		});
	};

	const handleSubmissionDrop = async (
		sessionId: string,
		submissionId: string,
	) => {
		try {
			await createSlotFn({
				data: {
					sessionId,
					submissionId,
					durationMin: settings.defaultPresentationMin,
				},
			});
			invalidate();
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Failed to assign");
		}
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

	const handleEventClick = (event: CalendarEvent) => {
		const data = event.data as SessionEventData | BreakEventData | undefined;
		if (data?.kind === "session" && data.sessionId) {
			setSelectedEvent({ kind: "session", id: data.sessionId });
		} else if (data?.kind === "break" && data.breakId) {
			setSelectedEvent({ kind: "break", id: data.breakId });
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
		<>
			<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
				<PageHeader icon={IconCalendar} title="Program Planner">
					<PublishButton />
				</PageHeader>
				{isOutsideRange && (
					<div className="flex items-center gap-2 border-b bg-amber-50 px-4 py-2 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
						<IconAlertTriangle size={13} className="shrink-0" />
						Outside conference dates
						{confStart && (
							<button
								type="button"
								className="ml-auto underline hover:no-underline"
								onClick={() => {
									setCurrentDate(confStart);
									setCalendarKey((k) => k + 1);
								}}
							>
								Return
							</button>
						)}
					</div>
				)}
				<CapacityStrip />
				<IssuesPanel sessions={sessions} />
				<div className="flex min-h-0 flex-1 md:hidden">
					<div className="flex-1 overflow-auto">
						<MobilePlanner
							sessions={sessions}
							breaks={breaks}
							conferenceStart={confStart}
							conferenceEnd={confEnd}
							timezone={settings.timezone || undefined}
							initialDate={currentDate ?? confStart ?? new Date()}
							onSessionClick={(id) => setSelectedEvent({ kind: "session", id })}
							onBreakClick={(id) => setSelectedEvent({ kind: "break", id })}
							onOpenSubmissions={() => setMobileQueueOpen(true)}
						/>
					</div>
				</div>
				{mobileQueueOpen && (
					<div className="fixed inset-0 z-40 flex md:hidden">
						<button
							type="button"
							className="absolute inset-0 bg-black/40"
							onClick={() => setMobileQueueOpen(false)}
							aria-label="Close submissions panel"
						/>
						<div className="relative ml-auto flex h-full w-full max-w-sm bg-background shadow-xl">
							<UnscheduledSidebar
								onCreateSession={(ids) => {
									setSelectionDialog({ submissionIds: ids });
									setMobileQueueOpen(false);
								}}
							/>
						</div>
					</div>
				)}
				<div className="hidden min-h-0 flex-1 md:flex">
					<UnscheduledSidebar
						onCreateSession={(ids) =>
							setSelectionDialog({ submissionIds: ids })
						}
					/>
					<div className="flex-1 overflow-auto p-4">
						<div data-planner-cal className="size-full">
							<IlamyResourceCalendar
								key={calendarKey}
								resources={resources}
								events={events}
								orientation="vertical"
								initialView="day"
								initialDate={initialDate}
								timezone={settings.timezone || undefined}
								timeFormat={
									settings.timeFormat === "12h" ? "12-hour" : "24-hour"
								}
								businessHours={businessHours}
								hideNonBusinessHours
								onDateChange={(date) => setCurrentDate(date.toDate())}
								onEventUpdate={handleEventUpdate}
								onEventClick={handleEventClick}
								renderCurrentTimeIndicator={() => null}
								renderEventForm={(props) => (
									<CreateEventDialog
										{...props}
										onCreated={invalidate}
										timezone={settings.timezone || undefined}
									/>
								)}
								renderEvent={(event) => {
									const data = event.data as
										| SessionEventData
										| BreakEventData
										| undefined;
									if (data?.kind === "break") {
										return <BreakEventCard title={event.title} />;
									}
									if (data?.kind === "session") {
										return (
											<SessionEventCard
												title={event.title}
												data={data}
												onSubmissionDrop={(submissionId) =>
													handleSubmissionDrop(data.sessionId, submissionId)
												}
											/>
										);
									}
									return null;
								}}
							/>
						</div>
					</div>
				</div>
			</div>

			<SessionEditorSheet
				sessionId={selectedEvent?.kind === "session" ? selectedEvent.id : null}
				onClose={() => setSelectedEvent(null)}
			/>
			<BreakEditorSheet
				breakId={selectedEvent?.kind === "break" ? selectedEvent.id : null}
				onClose={() => setSelectedEvent(null)}
			/>
			{selectionDialog && (
				<CreateSessionDialog
					open={true}
					submissionIds={selectionDialog.submissionIds}
					defaultStartAt={computeDefaultStartAt(
						currentDate,
						sessions,
						confStart,
						settings.dayStart,
					)}
					timezone={settings.timezone || undefined}
					onClose={() => setSelectionDialog(null)}
					onCreated={() => {
						invalidate();
						setSelectionDialog(null);
					}}
				/>
			)}
		</>
	);
}

function computeDefaultStartAt(
	currentDate: Date | null,
	sessions: Array<{ startAt: string | Date; endAt: string | Date }>,
	confStart: Date | null,
	dayStartTime: string,
): Date {
	const day = currentDate ?? confStart ?? new Date();
	const dayBegin = new Date(day);
	const [h, m] = (dayStartTime || "09:00").split(":").map(Number);
	dayBegin.setHours(h, m, 0, 0);

	const dayEnd = new Date(dayBegin);
	dayEnd.setHours(23, 59, 59, 999);

	const daySessions = sessions.filter((s) => {
		const start = new Date(s.startAt);
		return start >= dayBegin && start <= dayEnd;
	});
	if (daySessions.length === 0) return dayBegin;
	return daySessions.reduce((acc: Date, s) => {
		const end = new Date(s.endAt);
		return end > acc ? end : acc;
	}, dayBegin);
}
