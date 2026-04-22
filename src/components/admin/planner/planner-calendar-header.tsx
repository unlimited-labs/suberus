import { useIlamyCalendarContext } from "@ilamy/calendar";
import {
	IconChevronLeft,
	IconChevronRight,
	IconPlus,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RoomFilterPopover } from "./room-filter-popover";

interface Room {
	id: string;
	name: string;
}

interface Props {
	rooms: Room[];
	hiddenRoomIds: Set<string>;
	onToggleRoom: (roomId: string) => void;
	onShowAllRooms: () => void;
}

const VIEWS = [
	{ key: "day", label: "Day" },
	{ key: "week", label: "Week" },
] as const;

export function PlannerCalendarHeader({
	rooms,
	hiddenRoomIds,
	onToggleRoom,
	onShowAllRooms,
}: Props) {
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
				<div className="flex items-center gap-0.5 rounded-md bg-muted p-1">
					<button
						type="button"
						onClick={prevPeriod}
						aria-label="Previous period"
						className="flex size-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-background hover:text-foreground hover:shadow-sm"
					>
						<IconChevronLeft className="h-4 w-4" />
					</button>
					<button
						type="button"
						onClick={today}
						className="h-7 rounded px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-background hover:text-foreground hover:shadow-sm"
					>
						Today
					</button>
					<button
						type="button"
						onClick={nextPeriod}
						aria-label="Next period"
						className="flex size-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-background hover:text-foreground hover:shadow-sm"
					>
						<IconChevronRight className="h-4 w-4" />
					</button>
				</div>
				<h2 className="truncate text-sm font-semibold tracking-tight">
					{title}
				</h2>
			</div>

			<div className="flex flex-wrap items-center gap-3">
				<RoomFilterPopover
					rooms={rooms}
					hiddenIds={hiddenRoomIds}
					onToggle={onToggleRoom}
					onShowAll={onShowAllRooms}
				/>
				<div
					role="tablist"
					aria-label="Calendar view"
					className="flex items-center gap-0.5 rounded-md bg-muted p-1"
				>
					{VIEWS.map((v) => {
						const active = view === v.key;
						return (
							<button
								key={v.key}
								type="button"
								role="tab"
								aria-selected={active}
								onClick={() => setView(v.key)}
								className={cn(
									"h-7 rounded px-3 text-xs font-medium transition-all",
									active
										? "bg-background text-foreground shadow-sm"
										: "text-muted-foreground hover:text-foreground",
								)}
							>
								{v.label}
							</button>
						);
					})}
				</div>
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
