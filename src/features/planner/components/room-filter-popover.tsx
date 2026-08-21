import { IconFilter } from "@tabler/icons-react";
import { Checkbox } from "@/shared/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";

interface Room {
	id: string;
	name: string;
}

interface Props {
	rooms: Room[];
	hiddenIds: Set<string>;
	onToggle: (roomId: string) => void;
	onShowAll: () => void;
}

export function RoomFilterPopover({
	rooms,
	hiddenIds,
	onToggle,
	onShowAll,
}: Props) {
	const hiddenCount = hiddenIds.size;
	const active = hiddenCount > 0;

	return (
		<Popover>
			<PopoverTrigger asChild>
				<button
					className={`flex h-9 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors ${
						active
							? "bg-primary/10 text-primary hover:bg-primary/15"
							: "text-muted-foreground hover:bg-muted hover:text-foreground"
					}`}
					data-testid="room-filter-toggle"
					type="button"
				>
					<IconFilter size={13} />
					Rooms
					{active && (
						<span className="bg-primary/20 text-primary rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
							{rooms.length - hiddenCount}/{rooms.length}
						</span>
					)}
				</button>
			</PopoverTrigger>
			<PopoverContent align="start" className="w-56 p-2">
				<div className="flex items-center justify-between px-1 pb-2">
					<span className="text-xs font-medium">Visible rooms</span>
					<button
						className="text-muted-foreground hover:text-foreground text-[11px] disabled:opacity-40"
						disabled={!active}
						onClick={onShowAll}
						type="button"
					>
						Show all
					</button>
				</div>
				<ul className="space-y-0.5">
					{rooms.map((r) => {
						const visible = !hiddenIds.has(r.id);
						return (
							<li key={r.id}>
								<label
									className="hover:bg-muted flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-xs"
									htmlFor={`room-filter-${r.id}`}
								>
									<Checkbox
										checked={visible}
										id={`room-filter-${r.id}`}
										onCheckedChange={() => onToggle(r.id)}
									/>
									<span className="truncate">{r.name}</span>
								</label>
							</li>
						);
					})}
				</ul>
			</PopoverContent>
		</Popover>
	);
}
