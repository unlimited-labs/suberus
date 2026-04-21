import type { CalendarEvent } from "@ilamy/calendar";
import { IconCalendar } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { BreakEditorSheet } from "@/components/admin/planner/break-editor-sheet";
import type { BreakEventData } from "@/components/admin/planner/break-event-card";
import { CapacityStrip } from "@/components/admin/planner/capacity-strip";
import { computeDefaultStartAt } from "@/components/admin/planner/compute-default-start-at";
import { CreateSessionDialog } from "@/components/admin/planner/create-session-dialog";
import { usePlannerEvents } from "@/components/admin/planner/hooks/use-planner-events";
import { usePlannerMutations } from "@/components/admin/planner/hooks/use-planner-mutations";
import { IssuesPanel } from "@/components/admin/planner/issues-panel";
import { MobilePlanner } from "@/components/admin/planner/mobile-planner";
import { MobileQueueOverlay } from "@/components/admin/planner/mobile-queue-overlay";
import { NoRoomsPlaceholder } from "@/components/admin/planner/no-rooms-placeholder";
import { OutsideRangeBanner } from "@/components/admin/planner/outside-range-banner";
import { PlannerCalendar } from "@/components/admin/planner/planner-calendar";
import {
	PlannerSelectionProvider,
	usePlannerSelection,
} from "@/components/admin/planner/planner-context";
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

function ProgramPlannerPage() {
	return (
		<PlannerSelectionProvider>
			<ProgramPlannerContent />
		</PlannerSelectionProvider>
	);
}

function ProgramPlannerContent() {
	const { data: rooms } = useSuspenseQuery(allRoomsQueryOptions());
	const { data: sessions } = useSuspenseQuery(allSessionsQueryOptions());
	const { data: breaks } = useSuspenseQuery(allBreaksQueryOptions());
	const { data: settings } = useSuspenseQuery(conferenceSettingsQueryOptions());

	const {
		selectedSessionId,
		selectedBreakId,
		selectSession,
		selectBreak,
		clearSelection,
		creationSubmissionIds,
		closeCreateFromSelection,
		mobileQueueOpen,
		setMobileQueueOpen,
	} = usePlannerSelection();

	const [currentDate, setCurrentDate] = useState<Date | null>(null);
	const [calendarKey, setCalendarKey] = useState(0);

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

	const handleEventClick = useCallback(
		(event: CalendarEvent) => {
			const data = event.data as SessionEventData | BreakEventData | undefined;
			if (data?.kind === "session") selectSession(data.sessionId);
			else if (data?.kind === "break") selectBreak(data.breakId);
		},
		[selectSession, selectBreak],
	);

	const handleReturnToConference = useCallback(() => {
		if (!confStart) return;
		setCurrentDate(confStart);
		setCalendarKey((k) => k + 1);
	}, [confStart]);

	const closeMobileQueue = useCallback(
		() => setMobileQueueOpen(false),
		[setMobileQueueOpen],
	);

	const handleSessionCreated = useCallback(() => {
		invalidate();
		closeCreateFromSelection();
	}, [invalidate, closeCreateFromSelection]);

	const tz = settings.timezone || undefined;
	const initialDate = confStart ?? undefined;

	if (rooms.length === 0) return <NoRoomsPlaceholder />;

	return (
		<>
			<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
				<PageHeader icon={IconCalendar} title="Program Planner">
					<PublishButton />
				</PageHeader>
				{isOutsideRange && (
					<OutsideRangeBanner
						onReturn={confStart ? handleReturnToConference : null}
					/>
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
							timezone={tz}
							initialDate={currentDate ?? confStart ?? new Date()}
						/>
					</div>
				</div>
				{mobileQueueOpen && <MobileQueueOverlay onClose={closeMobileQueue} />}
				<div className="hidden min-h-0 flex-1 md:flex">
					<UnscheduledSidebar />
					<div className="flex-1 overflow-auto p-4">
						<PlannerCalendar
							calendarKey={calendarKey}
							resources={resources}
							events={events}
							initialDate={initialDate}
							timezone={tz}
							timeFormat={settings.timeFormat}
							dayStart={settings.dayStart}
							dayEnd={settings.dayEnd}
							onDateChange={setCurrentDate}
							onEventUpdate={handleEventUpdate}
							onEventClick={handleEventClick}
							onSubmissionDrop={handleSubmissionDrop}
							onCreated={invalidate}
						/>
					</div>
				</div>
			</div>

			<SessionEditorSheet
				sessionId={selectedSessionId}
				onClose={clearSelection}
			/>
			<BreakEditorSheet breakId={selectedBreakId} onClose={clearSelection} />
			{creationSubmissionIds && (
				<CreateSessionDialog
					open={true}
					submissionIds={creationSubmissionIds}
					defaultStartAt={computeDefaultStartAt(
						currentDate,
						sessions,
						confStart,
						settings.dayStart,
					)}
					timezone={tz}
					onClose={closeCreateFromSelection}
					onCreated={handleSessionCreated}
				/>
			)}
		</>
	);
}
