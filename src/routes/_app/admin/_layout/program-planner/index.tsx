import type { CalendarEvent } from "@ilamy/calendar";
import { IconAlertTriangle, IconCalendar } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BreakEditorSheet } from "@/components/admin/planner/break-editor-sheet";
import type { BreakEventData } from "@/components/admin/planner/break-event-card";
import { CapacityStrip } from "@/components/admin/planner/capacity-strip";
import { CreateSessionDialog } from "@/components/admin/planner/create-session-dialog";
import { IssuesPanel } from "@/components/admin/planner/issues-panel";
import { MobilePlanner } from "@/components/admin/planner/mobile-planner";
import { PublishButton } from "@/components/admin/planner/publish-button";
import { SessionEditorSheet } from "@/components/admin/planner/session-editor-sheet";
import type { SessionEventData } from "@/components/admin/planner/session-event-card";
import { UnscheduledSidebar } from "@/components/admin/planner/unscheduled-sidebar";
import { PageHeader } from "@/components/layout/page-header";
import {
	allSessionsQueryOptions,
	unscheduledSubmissionsQueryOptions,
} from "@/utils/program-sessions.functions";
import { allProgramTracksQueryOptions } from "@/utils/program-tracks.functions";
import { allRoomsQueryOptions } from "@/utils/rooms.functions";
import {
	scheduleCapacityQueryOptions,
	scheduleStateQueryOptions,
} from "@/utils/schedule.functions";
import { allBreaksQueryOptions } from "@/utils/schedule-breaks.functions";
import { conferenceSettingsQueryOptions } from "@/utils/settings.functions";
import { computeDefaultStartAt } from "./compute-default-start-at";
import { PlannerCalendar } from "./planner-calendar";
import { usePlannerEvents } from "./use-planner-events";
import { usePlannerMutations } from "./use-planner-mutations";

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

	const { resources, events } = usePlannerEvents(rooms, sessions, breaks);
	const { invalidate, handleSubmissionDrop, handleEventUpdate } =
		usePlannerMutations(settings.defaultPresentationMin);

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
					<PublishButton
						onSessionClick={(id) => setSelectedEvent({ kind: "session", id })}
					/>
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
				<IssuesPanel
					sessions={sessions}
					onSessionClick={(id) => setSelectedEvent({ kind: "session", id })}
				/>
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
						<PlannerCalendar
							calendarKey={calendarKey}
							resources={resources}
							events={events}
							initialDate={initialDate}
							timezone={settings.timezone || undefined}
							timeFormat={settings.timeFormat}
							dayStart={settings.dayStart}
							dayEnd={settings.dayEnd}
							onDateChange={(d) => setCurrentDate(d)}
							onEventUpdate={handleEventUpdate}
							onEventClick={handleEventClick}
							onSubmissionDrop={handleSubmissionDrop}
							onCreated={invalidate}
						/>
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
