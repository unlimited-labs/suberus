import {
	type CalendarEvent,
	type CalendarView,
	IlamyResourceCalendar,
	type IlamyResourceCalendarProps,
	type WeekDays,
} from "@ilamy/calendar";
import { useCallback } from "react";
import { CreateEventDialog } from "./create-event-dialog";
import { PlannerCalendarHeader } from "./planner-calendar-header";
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
	timezone: string | undefined;
	timeFormat: "12h" | "24h" | null | undefined;
	dayStart: string;
	dayEnd: string;
	hiddenDays: WeekDays[];
	onDateChange: (date: Date) => void;
	onViewChange: (view: CalendarView) => void;
	onEventUpdate: (event: CalendarEvent) => void;
	onEventClick: (event: CalendarEvent) => void;
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

const renderEvent: NonNullable<IlamyResourceCalendarProps["renderEvent"]> = (
	event,
) => <PlannerEventRenderer event={event} />;

const headerComponent = <PlannerCalendarHeader />;

export function PlannerCalendar({
	calendarKey,
	resources,
	events,
	initialDate,
	initialView,
	timezone,
	timeFormat,
	dayStart,
	dayEnd,
	hiddenDays,
	onDateChange,
	onViewChange,
	onEventUpdate,
	onEventClick,
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
		(props) =>
			props.open ? <CreateEventDialog {...props} timezone={timezone} /> : null,
		[timezone],
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
				hiddenDays={hiddenDays}
				onDateChange={handleDateChange}
				onViewChange={handleViewChange}
				onEventUpdate={onEventUpdate}
				onEventClick={onEventClick}
				renderCurrentTimeIndicator={hideCurrentTimeIndicator}
				renderEventForm={renderEventForm}
				renderEvent={renderEvent}
				headerComponent={headerComponent}
			/>
		</div>
	);
}
