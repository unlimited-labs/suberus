import {
	type CalendarEvent,
	IlamyResourceCalendar,
	type IlamyResourceCalendarProps,
	type WeekDays,
} from "@ilamy/calendar";
import {
	BreakEventCard,
	type BreakEventData,
} from "@/components/admin/planner/break-event-card";
import { CreateEventDialog } from "@/components/admin/planner/create-event-dialog";
import {
	SessionEventCard,
	type SessionEventData,
} from "@/components/admin/planner/session-event-card";

interface Resource {
	id: string;
	title: string;
	position: number;
}

interface CalendarMoveEvent {
	id: string | number;
	start: { toDate: () => Date };
	end: { toDate: () => Date };
	resourceId?: string | number;
	data?: { kind?: "session" | "break"; sessionId?: string; breakId?: string };
}

interface Props {
	calendarKey: number;
	resources: Resource[];
	events: NonNullable<IlamyResourceCalendarProps["events"]>;
	initialDate: Date | undefined;
	timezone: string | undefined;
	timeFormat: "12h" | "24h" | null | undefined;
	dayStart: string;
	dayEnd: string;
	onDateChange: (date: Date) => void;
	onEventUpdate: (event: CalendarMoveEvent) => void;
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

export function PlannerCalendar({
	calendarKey,
	resources,
	events,
	initialDate,
	timezone,
	timeFormat,
	dayStart,
	dayEnd,
	onDateChange,
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

	return (
		<div data-planner-cal className="size-full">
			<IlamyResourceCalendar
				key={calendarKey}
				resources={resources}
				events={events}
				orientation="vertical"
				initialView="day"
				initialDate={initialDate}
				timezone={timezone}
				timeFormat={timeFormat === "12h" ? "12-hour" : "24-hour"}
				businessHours={businessHours}
				hideNonBusinessHours
				onDateChange={(date) => onDateChange(date.toDate())}
				onEventUpdate={onEventUpdate}
				onEventClick={onEventClick}
				renderCurrentTimeIndicator={() => null}
				renderEventForm={(props) => (
					<CreateEventDialog
						{...props}
						onCreated={onCreated}
						timezone={timezone}
					/>
				)}
				renderEvent={(event) => {
					const data = event.data as
						| SessionEventData
						| BreakEventData
						| undefined;
					if (data?.kind === "break") {
						return <BreakEventCard title={event.title} data={data} />;
					}
					if (data?.kind === "session") {
						return (
							<SessionEventCard
								title={event.title}
								data={data}
								onSubmissionDrop={(submissionId) =>
									onSubmissionDrop(data.sessionId, submissionId)
								}
							/>
						);
					}
					return null;
				}}
			/>
		</div>
	);
}
