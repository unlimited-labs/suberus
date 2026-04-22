import {
	type CalendarEvent,
	type CalendarView,
	IlamyResourceCalendar,
	type IlamyResourceCalendarProps,
	type WeekDays,
} from "@ilamy/calendar";
import { useCallback } from "react";
import { CreateEventDialog } from "./create-event-dialog";
import { PlannerEventRenderer } from "./planner-event-renderer";

interface Resource {
	id: string;
	title: string;
	position: number;
}

interface Props {
	calendarKey: string | number;
	resources: Resource[];
	events: NonNullable<IlamyResourceCalendarProps["events"]>;
	initialDate: Date | undefined;
	initialView: CalendarView;
	defaultStartAt: Date;
	timezone: string | undefined;
	timeFormat: "12h" | "24h" | null | undefined;
	dayStart: string;
	dayEnd: string;
	onDateChange: (date: Date) => void;
	onViewChange: (view: CalendarView) => void;
	onEventUpdate: (event: CalendarEvent) => void;
	onEventClick: (event: CalendarEvent) => void;
	onSubmissionDrop: (sessionId: string, submissionId: string) => void;
	onCreated: () => void;
}

const ALL_DAYS: WeekDays[] = [
	"sunday",
	"monday",
	"tuesday",
	"wednesday",
	"thursday",
	"friday",
	"saturday",
];

function parseHour(v: string, fallback: number) {
	const m = v?.match(/^(\d{1,2}):(\d{2})$/);
	if (!m) return fallback;
	return Number(m[1]) + Number(m[2]) / 60;
}

const hideCurrentTimeIndicator = () => null;

export function PlannerCalendar({
	calendarKey,
	resources,
	events,
	initialDate,
	initialView,
	defaultStartAt,
	timezone,
	timeFormat,
	dayStart,
	dayEnd,
	onDateChange,
	onViewChange,
	onEventUpdate,
	onEventClick,
	onSubmissionDrop,
	onCreated,
}: Props) {
	const businessHours = {
		daysOfWeek: ALL_DAYS,
		startTime: parseHour(dayStart, 9),
		endTime: parseHour(dayEnd, 18),
	};

	const handleDateChange = useCallback<
		NonNullable<IlamyResourceCalendarProps["onDateChange"]>
	>((date) => onDateChange(date.toDate()), [onDateChange]);

	const handleViewChange = useCallback<
		NonNullable<IlamyResourceCalendarProps["onViewChange"]>
	>((view) => onViewChange(view), [onViewChange]);

	const renderEventForm = useCallback<
		NonNullable<IlamyResourceCalendarProps["renderEventForm"]>
	>(
		(props) => (
			<CreateEventDialog
				{...props}
				onCreated={onCreated}
				timezone={timezone}
				defaultStartAt={defaultStartAt}
			/>
		),
		[onCreated, timezone, defaultStartAt],
	);

	const renderEvent = useCallback<
		NonNullable<IlamyResourceCalendarProps["renderEvent"]>
	>(
		(event) => (
			<PlannerEventRenderer event={event} onSubmissionDrop={onSubmissionDrop} />
		),
		[onSubmissionDrop],
	);

	return (
		<div className="size-full">
			<IlamyResourceCalendar
				key={calendarKey}
				resources={resources}
				events={events}
				orientation="vertical"
				initialView={initialView}
				initialDate={initialDate}
				timezone={timezone}
				timeFormat={timeFormat === "12h" ? "12-hour" : "24-hour"}
				businessHours={businessHours}
				hideNonBusinessHours
				onDateChange={handleDateChange}
				onViewChange={handleViewChange}
				onEventUpdate={onEventUpdate}
				onEventClick={onEventClick}
				renderCurrentTimeIndicator={hideCurrentTimeIndicator}
				renderEventForm={renderEventForm}
				renderEvent={renderEvent}
			/>
		</div>
	);
}
