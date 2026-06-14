import { IconCalendar } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";
import { BreakEditorSheet } from "@/components/admin/planner/break-editor-sheet";
import { CapacityStrip } from "@/components/admin/planner/capacity-strip";
import { computeHiddenWeekdays } from "@/components/admin/planner/compute-hidden-weekdays";
import { CreateSessionDialog } from "@/components/admin/planner/create-session-dialog";
import { useNextStartAt } from "@/components/admin/planner/hooks/use-next-start-at";
import { usePlannerCalendarHandlers } from "@/components/admin/planner/hooks/use-planner-calendar-handlers";
import { usePlannerEvents } from "@/components/admin/planner/hooks/use-planner-events";
import { usePlannerMutations } from "@/components/admin/planner/hooks/use-planner-mutations";
import { useRoomVisibility } from "@/components/admin/planner/hooks/use-room-visibility";
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
import { PlannerToolsProvider } from "@/components/admin/planner/planner-tools-context";
import { PublishButton } from "@/components/admin/planner/publish-button";
import { SessionEditorSheet } from "@/components/admin/planner/session-editor-sheet";
import { UnscheduledSidebar } from "@/components/admin/planner/unscheduled-sidebar";
import { conferenceSettingsQueryOptions } from "@/features/settings/api/settings";
import { allBreaksQueryOptions } from "@/server-fns/planner/breaks";
import { allRoomsQueryOptions } from "@/server-fns/planner/rooms";
import {
	scheduleCapacityQueryOptions,
	scheduleStateQueryOptions,
} from "@/server-fns/planner/schedule";
import {
	allSessionsQueryOptions,
	unscheduledSubmissionsQueryOptions,
} from "@/server-fns/planner/sessions";
import { allProgramTracksQueryOptions } from "@/server-fns/planner/tracks";
import { PageHeader } from "@/shared/components/layout/page-header";

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
		clearSelection,
		creationSubmissionIds,
		closeCreateFromSelection,
		mobileQueueOpen,
		setMobileQueueOpen,
	} = usePlannerSelection();

	const confStart = settings.conferenceStartDate
		? new Date(settings.conferenceStartDate)
		: null;
	const confEnd = settings.conferenceEndDate
		? new Date(settings.conferenceEndDate)
		: null;

	const roomVisibility = useRoomVisibility(rooms);

	const { resources, events } = usePlannerEvents(
		roomVisibility.visibleRooms,
		sessions,
		breaks,
	);

	const hiddenWeekdays = useMemo(
		() => computeHiddenWeekdays(confStart, confEnd),
		[confStart, confEnd],
	);
	const { invalidate, handleSubmissionDrop, handleEventUpdate } =
		usePlannerMutations(settings.defaultPresentationMin);
	const {
		currentDate,
		setCurrentDate,
		currentView,
		setCurrentView,
		calendarKey,
		handleEventClick,
		returnToConference,
		handleSessionCreated,
	} = usePlannerCalendarHandlers(confStart);
	const defaultStartAt = useNextStartAt(currentDate);

	const isOutsideRange =
		currentDate !== null &&
		confStart !== null &&
		confEnd !== null &&
		(currentDate < confStart || currentDate > confEnd);

	const closeMobileQueue = useCallback(
		() => setMobileQueueOpen(false),
		[setMobileQueueOpen],
	);

	const tz = settings.timezone || undefined;

	if (rooms.length === 0) return <NoRoomsPlaceholder />;

	return (
		<>
			<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
				<PageHeader icon={IconCalendar} title="Program Planner">
					<PublishButton />
				</PageHeader>
				{isOutsideRange && (
					<OutsideRangeBanner
						onReturn={confStart ? returnToConference : null}
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
						<PlannerToolsProvider
							rooms={rooms}
							room={roomVisibility}
							defaultStartAt={defaultStartAt}
							onCreated={invalidate}
							onSubmissionDrop={handleSubmissionDrop}
							onJumpToConferenceStart={confStart ? returnToConference : null}
						>
							<PlannerCalendar
								calendarKey={`${calendarKey}:${roomVisibility.hiddenRoomsKey}`}
								resources={resources}
								events={events}
								initialDate={currentDate ?? confStart ?? undefined}
								initialView={currentView}
								timezone={tz}
								timeFormat={settings.timeFormat}
								dayStart={settings.dayStart}
								dayEnd={settings.dayEnd}
								hiddenDays={hiddenWeekdays}
								onDateChange={setCurrentDate}
								onViewChange={setCurrentView}
								onEventUpdate={handleEventUpdate}
								onEventClick={handleEventClick}
							/>
						</PlannerToolsProvider>
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
					defaultStartAt={defaultStartAt}
					timezone={tz}
					onClose={closeCreateFromSelection}
					onCreated={handleSessionCreated}
				/>
			)}
		</>
	);
}
