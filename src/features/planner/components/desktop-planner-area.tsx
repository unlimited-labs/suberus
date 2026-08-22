import { PlannerCalendar } from "@/features/planner/components/planner-calendar";
import { PlannerToolsProvider } from "@/features/planner/components/planner-tools-context";
import { UnscheduledSidebar } from "@/features/planner/components/unscheduled-sidebar";

type ToolsProps = Omit<
	React.ComponentProps<typeof PlannerToolsProvider>,
	"children" | "onJumpToConferenceStart"
>;
type CalendarProps = Omit<
	React.ComponentProps<typeof PlannerCalendar>,
	"initialDate"
>;

interface DesktopPlannerAreaProps extends ToolsProps, CalendarProps {
	currentDate: Date | null;
	confStart: Date | null;
	returnToConference: () => void;
}

export function DesktopPlannerArea({
	currentDate,
	confStart,
	returnToConference,
	rooms,
	room,
	defaultStartAt,
	onCreated,
	onSubmissionDrop,
	...calendarProps
}: DesktopPlannerAreaProps) {
	return (
		<div className="hidden min-h-0 flex-1 md:flex">
			<UnscheduledSidebar />
			<div className="flex-1 overflow-auto p-4">
				<PlannerToolsProvider
					defaultStartAt={defaultStartAt}
					onCreated={onCreated}
					onJumpToConferenceStart={confStart ? returnToConference : null}
					onSubmissionDrop={onSubmissionDrop}
					room={room}
					rooms={rooms}
				>
					<PlannerCalendar
						{...calendarProps}
						initialDate={currentDate ?? confStart ?? undefined}
					/>
				</PlannerToolsProvider>
			</div>
		</div>
	);
}
