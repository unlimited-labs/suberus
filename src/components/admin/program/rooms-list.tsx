import {
	IconArrowDown,
	IconArrowUp,
	IconEdit,
	IconExternalLink,
	IconLoader2,
	IconTrash,
} from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { deleteRoomFn, updateRoomFn } from "@/utils/rooms.functions";
import type { RoomWithStats } from "@/utils/rooms.server";

interface RoomsListProps {
	rooms: RoomWithStats[];
	onEdit: (room: RoomWithStats) => void;
	onUpdate: () => void;
}

export function RoomsList({ rooms, onEdit, onUpdate }: RoomsListProps) {
	const [pendingId, setPendingId] = useState<string | null>(null);
	const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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

	const handleDelete = async (id: string) => {
		setPendingId(id);
		setConfirmDeleteId(null);
		try {
			await deleteRoomFn({ data: { id } });
			toast.success("Room deleted");
			onUpdate();
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Failed to delete room";
			toast.error(message);
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
									<div className="flex justify-end gap-2">
										{confirmDeleteId === room.id ? (
											<>
												<Button
													variant="destructive"
													size="sm"
													onClick={() => handleDelete(room.id)}
													disabled={isBusy}
													data-testid="room-confirm-delete"
												>
													{isBusy && (
														<IconLoader2 className="mr-1 size-4 animate-spin" />
													)}
													Confirm
												</Button>
												<Button
													variant="outline"
													size="sm"
													onClick={() => setConfirmDeleteId(null)}
												>
													Cancel
												</Button>
											</>
										) : (
											<>
												<Button
													variant="ghost"
													size="icon"
													onClick={() => onEdit(room)}
													aria-label="Edit"
													data-testid="room-edit"
												>
													<IconEdit className="size-4" />
												</Button>
												<Button
													variant="ghost"
													size="icon"
													onClick={() => setConfirmDeleteId(room.id)}
													disabled={isBusy || room.sessionCount > 0}
													aria-label="Delete"
													data-testid="room-delete"
												>
													<IconTrash className="size-4" />
												</Button>
											</>
										)}
									</div>
								</TableCell>
							</TableRow>
						);
					})}
				</TableBody>
			</Table>
		</div>
	);
}
