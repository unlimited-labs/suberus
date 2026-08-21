import {
	IconArrowDown,
	IconArrowUp,
	IconExternalLink,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { deleteRoomFn, updateRoomFn } from "@/features/planner/api/rooms";
import type { RoomWithStats } from "@/features/planner/server/rooms";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/ui/table";
import { RowActions } from "./row-actions";
import { useConfirmDelete } from "./use-confirm-delete";

interface RoomsListProps {
	rooms: RoomWithStats[];
	onEdit: (room: RoomWithStats) => void;
	onUpdate: () => void;
}

export function RoomsList({ rooms, onEdit, onUpdate }: RoomsListProps) {
	const {
		pendingId,
		setPendingId,
		confirmId,
		askDelete,
		cancelDelete,
		remove,
	} = useConfirmDelete({
		onDelete: (id) => deleteRoomFn({ data: { id } }),
		successMessage: "Room deleted",
		fallbackErrorMessage: "Failed to delete room",
		onMutated: onUpdate,
	});

	const swapOrder = async (a: RoomWithStats, b: RoomWithStats) => {
		setPendingId(a.id);
		try {
			await Promise.all([
				updateRoomFn({ data: { id: a.id, order: b.order } }),
				updateRoomFn({ data: { id: b.id, order: a.order } }),
			]);
			onUpdate();
		} catch {
			toast.error("Failed to reorder");
		}
		setPendingId(null);
	};

	if (rooms.length === 0) {
		return (
			<div className="flex min-h-[160px] items-center justify-center rounded-md border border-dashed">
				<p className="text-muted-foreground text-sm">
					No rooms yet. Create your first room.
				</p>
			</div>
		);
	}

	const sorted = rooms.toSorted(
		(a, b) => a.order - b.order || a.name.localeCompare(b.name),
	);

	return (
		<div className="overflow-x-auto rounded-md border" data-testid="rooms-list">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead className="w-24">Order</TableHead>
						<TableHead>Name</TableHead>
						<TableHead>Description</TableHead>
						<TableHead className="text-center">Sessions</TableHead>
						<TableHead className="text-right">Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{sorted.map((room, idx) => {
						const prev = idx > 0 ? sorted[idx - 1] : null;
						const next = idx < sorted.length - 1 ? sorted[idx + 1] : null;
						const isBusy = pendingId === room.id;
						return (
							<TableRow data-testid={`room-row-${room.id}`} key={room.id}>
								<TableCell>
									<div className="flex items-center gap-1">
										<Button
											aria-label="Move up"
											className="size-7"
											disabled={!prev || isBusy}
											onClick={() => prev && swapOrder(room, prev)}
											size="icon"
											variant="ghost"
										>
											<IconArrowUp className="size-4" />
										</Button>
										<Button
											aria-label="Move down"
											className="size-7"
											disabled={!next || isBusy}
											onClick={() => next && swapOrder(room, next)}
											size="icon"
											variant="ghost"
										>
											<IconArrowDown className="size-4" />
										</Button>
									</div>
								</TableCell>
								<TableCell className="font-medium">
									<div className="flex items-center gap-1.5">
										<span>{room.name}</span>
										{room.link && (
											<a
												aria-label={`Open ${room.name} link`}
												className="text-muted-foreground hover:text-foreground"
												href={room.link}
												rel="noopener noreferrer"
												target="_blank"
											>
												<IconExternalLink className="size-3.5" />
											</a>
										)}
									</div>
								</TableCell>
								<TableCell className="text-muted-foreground max-w-xs truncate text-xs">
									{room.description ?? "—"}
								</TableCell>
								<TableCell className="text-center">
									<Badge variant="secondary">{room.sessionCount}</Badge>
								</TableCell>
								<TableCell className="text-right">
									<RowActions
										deleteDisabled={room.sessionCount > 0}
										isBusy={isBusy}
										isConfirming={confirmId === room.id}
										onAskDelete={() => askDelete(room.id)}
										onCancelDelete={cancelDelete}
										onConfirmDelete={() => remove(room.id)}
										onEdit={() => onEdit(room)}
										testIdPrefix="room"
									/>
								</TableCell>
							</TableRow>
						);
					})}
				</TableBody>
			</Table>
		</div>
	);
}
