import { IconCalendar } from "@tabler/icons-react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { allBreaksQueryOptions } from "@/features/planner/api/breaks";
import { allRoomsQueryOptions } from "@/features/planner/api/rooms";
import {
	scheduleCapacityQueryOptions,
	scheduleStateQueryOptions,
} from "@/features/planner/api/schedule";
import {
	allSessionsQueryOptions,
	unscheduledSubmissionsQueryOptions,
} from "@/features/planner/api/sessions";
import { allProgramTracksQueryOptions } from "@/features/planner/api/tracks";
import { CapacityStrip } from "@/features/planner/components/capacity-strip";
import {
	computeConferenceRange,
	isOutsideConferenceRange,
} from "@/features/planner/components/compute-conference-range";
import { computeHiddenWeekdays } from "@/features/planner/components/compute-hidden-weekdays";
import { DesktopPlannerArea } from "@/features/planner/components/desktop-planner-area";
import { useNextStartAt } from "@/features/planner/components/hooks/use-next-start-at";
import { usePlannerCalendarHandlers } from "@/features/planner/components/hooks/use-planner-calendar-handlers";
import { usePlannerEvents } from "@/features/planner/components/hooks/use-planner-events";
import { usePlannerMutations } from "@/features/planner/components/hooks/use-planner-mutations";
import { useRoomVisibility } from "@/features/planner/components/hooks/use-room-visibility";
import { IssuesPanel } from "@/features/planner/components/issues-panel";
import { MobilePlannerArea } from "@/features/planner/components/mobile-planner-area";
import { MobileQueueOverlay } from "@/features/planner/components/mobile-queue-overlay";
import { NoRoomsPlaceholder } from "@/features/planner/components/no-rooms-placeholder";
import { OutsideRangeBanner } from "@/features/planner/components/outside-range-banner";
import {
	PlannerSelectionProvider,
	usePlannerSelection,
} from "@/features/planner/components/planner-context";
import { PlannerOverlays } from "@/features/planner/components/planner-overlays";
import { PublishButton } from "@/features/planner/components/publish-button";
import { conferenceSettingsQueryOptions } from "@/features/settings/api/settings";
import { adminUsersQueryOptions } from "@/features/users/api/users";
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
	// Chair candidates for the session editor (fetched here so planner stays off
	// the users slice).
	const { data: chairCandidates } = useQuery(adminUsersQueryOptions());

	const { mobileQueueOpen, setMobileQueueOpen } = usePlannerSelection();

	const { confStart, confEnd, tz } = computeConferenceRange(settings);

	const roomVisibility = useRoomVisibility(rooms);

	const { resources, events } = usePlannerEvents(
		roomVisibility.visibleRooms,
		sessions,
		breaks,
	);

	const hiddenWeekdays = computeHiddenWeekdays(confStart, confEnd);
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

	const isOutsideRange = isOutsideConferenceRange(
		currentDate,
		confStart,
		confEnd,
	);

	const closeMobileQueue = () => setMobileQueueOpen(false);

	if (rooms.length === 0) return <NoRoomsPlaceholder />;

	return (
		<>
			<div className="flex h-full min-h-0 flex-col overflow-hidden">
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
				<MobilePlannerArea
					sessions={sessions}
					breaks={breaks}
					conferenceStart={confStart}
					conferenceEnd={confEnd}
					timezone={tz}
					currentDate={currentDate}
				/>
				{mobileQueueOpen && <MobileQueueOverlay onClose={closeMobileQueue} />}
				<DesktopPlannerArea
					rooms={rooms}
					room={roomVisibility}
					defaultStartAt={defaultStartAt}
					onCreated={invalidate}
					onSubmissionDrop={handleSubmissionDrop}
					currentDate={currentDate}
					confStart={confStart}
					returnToConference={returnToConference}
					calendarKey={`${calendarKey}:${roomVisibility.hiddenRoomsKey}`}
					resources={resources}
					events={events}
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
			</div>

			<PlannerOverlays
				users={chairCandidates ?? []}
				defaultStartAt={defaultStartAt}
				timezone={tz}
				onSessionCreated={handleSessionCreated}
			/>
		</>
	);
}
