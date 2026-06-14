import { useIlamyCalendarContext } from "@ilamy/calendar";
import { IconCalendarStar, IconPlus, IconWand } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { conferenceSettingsQueryOptions } from "@/features/settings/api/settings";
import { Button } from "@/shared/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/shared/ui/tooltip";
import { CalendarNavGroup } from "./header/calendar-nav-group";
import { CalendarViewSwitcher } from "./header/calendar-view-switcher";
import { usePlannerTools } from "./planner-tools-context";
import { RoomFilterPopover } from "./room-filter-popover";

export function PlannerCalendarHeader() {
	const { rooms, room, onJumpToConferenceStart } = usePlannerTools();
	const navigate = useNavigate();
	const { data: settings } = useSuspenseQuery(conferenceSettingsQueryOptions());
	const autoplanEnabled = settings.autoplanEnabled;
	const {
		currentDate,
		view,
		setView,
		nextPeriod,
		prevPeriod,
		today,
		openEventForm,
	} = useIlamyCalendarContext();

	const canJumpToConference = onJumpToConferenceStart != null;

	const title =
		view === "week"
			? `${currentDate.startOf("week").format("MMM D")} — ${currentDate.endOf("week").format("MMM D, YYYY")}`
			: currentDate.format("dddd, MMM D, YYYY");

	return (
		<TooltipProvider>
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
					<Tooltip>
						<TooltipTrigger asChild>
							<span>
								<Button
									size="sm"
									variant="outline"
									className="h-9 gap-1.5"
									onClick={() => onJumpToConferenceStart?.()}
									disabled={!canJumpToConference}
									data-testid="planner-jump-conference-start"
								>
									<IconCalendarStar className="h-4 w-4" />
									<span>Conference start</span>
								</Button>
							</span>
						</TooltipTrigger>
						<TooltipContent>
							{canJumpToConference
								? "Jump to day 1 of the conference"
								: "Set conference start and end dates in settings to enable"}
						</TooltipContent>
					</Tooltip>
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
					<Tooltip>
						<TooltipTrigger asChild>
							<span>
								<Button
									size="sm"
									variant="outline"
									className="h-9 gap-1.5"
									disabled={!autoplanEnabled}
									onClick={() =>
										navigate({ to: "/admin/program-planner/auto-plan" })
									}
								>
									<IconWand className="h-4 w-4" />
									<span>Auto-plan</span>
								</Button>
							</span>
						</TooltipTrigger>
						<TooltipContent>
							{autoplanEnabled
								? "Cluster accepted abstracts into sessions via LLM"
								: "Enable autoplanner in Configuration/Program/Planner"}
						</TooltipContent>
					</Tooltip>
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
		</TooltipProvider>
	);
}
