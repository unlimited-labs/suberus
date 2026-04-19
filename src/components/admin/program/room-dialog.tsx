import { IconLoader2 } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createRoomFn, updateRoomFn } from "@/utils/rooms.functions";
import type { RoomWithStats } from "@/utils/rooms.server";

interface RoomDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	room?: RoomWithStats;
	onSuccess: () => void;
}

export function RoomDialog({
	open,
	onOpenChange,
	room,
	onSuccess,
}: RoomDialogProps) {
	const isEdit = !!room;
	const [name, setName] = useState(room?.name ?? "");
	const [capacity, setCapacity] = useState<string>(
		room?.capacity?.toString() ?? "",
	);
	const [isSaving, setIsSaving] = useState(false);

	const handleSave = async () => {
		if (!name.trim()) {
			toast.error("Room name is required");
			return;
		}
		const parsedCapacity = capacity.trim() ? Number(capacity) : null;
		if (
			parsedCapacity !== null &&
			(!Number.isInteger(parsedCapacity) || parsedCapacity <= 0)
		) {
			toast.error("Capacity must be a positive integer");
			return;
		}

		setIsSaving(true);
		try {
			if (isEdit) {
				await updateRoomFn({
					data: { id: room.id, name: name.trim(), capacity: parsedCapacity },
				});
				toast.success("Room updated");
			} else {
				await createRoomFn({
					data: { name: name.trim(), capacity: parsedCapacity },
				});
				toast.success("Room created");
			}
			onSuccess();
			onOpenChange(false);
			setName("");
			setCapacity("");
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Failed to save room";
			toast.error(message);
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{isEdit ? "Edit Room" : "Create Room"}</DialogTitle>
				</DialogHeader>

				<div className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="room-name">Name *</Label>
						<Input
							id="room-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Aula Magna, Room 101, …"
							maxLength={200}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="room-capacity">Capacity</Label>
						<Input
							id="room-capacity"
							type="number"
							min={1}
							value={capacity}
							onChange={(e) => setCapacity(e.target.value)}
							placeholder="Optional"
						/>
						<p className="text-xs text-muted-foreground">
							Used only for display; not enforced.
						</p>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button onClick={handleSave} disabled={isSaving}>
						{isSaving && <IconLoader2 className="mr-2 size-4 animate-spin" />}
						{isEdit ? "Save" : "Create"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
