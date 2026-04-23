import { useIlamyCalendarContext } from "@ilamy/calendar";
import { IconPlus, IconWand } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { CalendarNavGroup } from "./header/calendar-nav-group";
import { CalendarViewSwitcher } from "./header/calendar-view-switcher";
import { usePlannerTools } from "./planner-tools-context";
import { RoomFilterPopover } from "./room-filter-popover";

export function PlannerCalendarHeader() {
	const { rooms, room } = usePlannerTools();
	const navigate = useNavigate();
	const {
		currentDate,
		view,
		setView,
		nextPeriod,
		prevPeriod,
		today,
		openEventForm,
	} = useIlamyCalendarContext();

	const title =
		view === "week"
			? `${currentDate.startOf("week").format("MMM D")} — ${currentDate.endOf("week").format("MMM D, YYYY")}`
			: currentDate.format("dddd, MMM D, YYYY");

	return (
		<div
			className="flex w-full flex-wrap items-center justify-between gap-4 px-1 py-0.5"
			data-testid="planner-calendar-header"
		>
			<div className="flex min-w-0 items-center gap-3">
				<CalendarNavGroup
					onPrev={prevPeriod}
					onNext={nextPeriod}
					onToday={today}
				/>
				<h2 className="truncate text-sm font-semibold tracking-tight">
					{title}
				</h2>
			</div>

			<div className="flex flex-wrap items-center gap-3">
				<RoomFilterPopover
					rooms={rooms}
					hiddenIds={room.hiddenRoomIds}
					onToggle={room.toggleRoom}
					onShowAll={room.showAll}
				/>
				<CalendarViewSwitcher current={view} onChange={setView} />
				<Button
					size="sm"
					variant="outline"
					className="h-9 gap-1.5"
					onClick={() => navigate({ to: "/admin/program-planner/auto-plan" })}
				>
					<IconWand className="h-4 w-4" />
					<span>Auto-plan</span>
				</Button>
				<Button
					size="sm"
					variant="default"
					className="h-9 gap-1.5"
					onClick={() => openEventForm()}
				>
					<IconPlus className="h-4 w-4" />
					<span>New</span>
				</Button>
			</div>
		</div>
	);
}
