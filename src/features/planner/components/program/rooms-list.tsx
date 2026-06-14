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
		} finally {
			setPendingId(null);
		}
	};

	if (rooms.length === 0) {
		return (
			<div className="flex min-h-[160px] items-center justify-center rounded-md border border-dashed">
				<p className="text-sm text-muted-foreground">
					No rooms yet. Create your first room.
				</p>
			</div>
		);
	}

	const sorted = [...rooms].sort(
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
							<TableRow key={room.id} data-testid={`room-row-${room.id}`}>
								<TableCell>
									<div className="flex items-center gap-1">
										<Button
											variant="ghost"
											size="icon"
											className="size-7"
											disabled={!prev || isBusy}
											onClick={() => prev && swapOrder(room, prev)}
											aria-label="Move up"
										>
											<IconArrowUp className="size-4" />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											className="size-7"
											disabled={!next || isBusy}
											onClick={() => next && swapOrder(room, next)}
											aria-label="Move down"
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
												href={room.link}
												target="_blank"
												rel="noopener noreferrer"
												className="text-muted-foreground hover:text-foreground"
												aria-label={`Open ${room.name} link`}
											>
												<IconExternalLink className="size-3.5" />
											</a>
										)}
									</div>
								</TableCell>
								<TableCell className="max-w-xs truncate text-xs text-muted-foreground">
									{room.description ?? "—"}
								</TableCell>
								<TableCell className="text-center">
									<Badge variant="secondary">{room.sessionCount}</Badge>
								</TableCell>
								<TableCell className="text-right">
									<RowActions
										isBusy={isBusy}
										isConfirming={confirmId === room.id}
										deleteDisabled={room.sessionCount > 0}
										onEdit={() => onEdit(room)}
										onAskDelete={() => askDelete(room.id)}
										onConfirmDelete={() => remove(room.id)}
										onCancelDelete={cancelDelete}
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
