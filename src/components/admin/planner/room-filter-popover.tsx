import { IconFilter } from "@tabler/icons-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

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
					type="button"
					data-testid="room-filter-toggle"
					className={`flex items-center gap-1.5 rounded border px-2 py-1 text-xs hover:bg-muted ${
						active
							? "border-primary/40 bg-primary/5 text-primary"
							: "text-muted-foreground"
					}`}
				>
					<IconFilter size={12} />
					Rooms
					{active && (
						<span className="rounded-full bg-primary/10 px-1.5 text-[10px] font-medium text-primary">
							{rooms.length - hiddenCount}/{rooms.length}
						</span>
					)}
				</button>
			</PopoverTrigger>
			<PopoverContent className="w-56 p-2" align="start">
				<div className="flex items-center justify-between px-1 pb-2">
					<span className="text-xs font-medium">Visible rooms</span>
					<button
						type="button"
						onClick={onShowAll}
						disabled={!active}
						className="text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-40"
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
									htmlFor={`room-filter-${r.id}`}
									className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-xs hover:bg-muted"
								>
									<Checkbox
										id={`room-filter-${r.id}`}
										checked={visible}
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
