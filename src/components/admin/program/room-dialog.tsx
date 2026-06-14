import { IconLoader2 } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";
import type { RoomWithStats } from "@/lib/server/planner/rooms";
import { createRoomFn, updateRoomFn } from "@/server-fns/planner/rooms";
import { getErrorMessage } from "@/shared/lib/error-message";
import { Button } from "@/shared/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";

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
	const [description, setDescription] = useState(room?.description ?? "");
	const [link, setLink] = useState(room?.link ?? "");
	const [isSaving, setIsSaving] = useState(false);

	const handleSave = async () => {
		if (!name.trim()) {
			toast.error("Room name is required");
			return;
		}
		const trimmedLink = link.trim();
		if (trimmedLink) {
			try {
				new URL(trimmedLink);
			} catch {
				toast.error("Link must be a valid URL");
				return;
			}
		}

		setIsSaving(true);
		try {
			const payload = {
				name: name.trim(),
				description: description.trim() || null,
				link: trimmedLink || null,
			};
			if (isEdit) {
				await updateRoomFn({ data: { id: room.id, ...payload } });
				toast.success("Room updated");
			} else {
				await createRoomFn({ data: payload });
				toast.success("Room created");
			}
			onSuccess();
			onOpenChange(false);
			setName("");
			setDescription("");
			setLink("");
		} catch (error) {
			toast.error(getErrorMessage(error, "Failed to save room"));
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent data-testid="room-dialog">
				<DialogHeader>
					<DialogTitle>{isEdit ? "Edit Room" : "Create Room"}</DialogTitle>
					<DialogDescription className="sr-only">
						Configure a room's name, description and join link.
					</DialogDescription>
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
							data-testid="room-name"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="room-description">Description</Label>
						<Textarea
							id="room-description"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Optional — building, floor, notes…"
							rows={2}
							maxLength={1000}
							data-testid="room-description"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="room-link">Link</Label>
						<Input
							id="room-link"
							type="url"
							value={link}
							onChange={(e) => setLink(e.target.value)}
							placeholder="https://maps.google.com/…"
							data-testid="room-link"
						/>
						<p className="text-xs text-muted-foreground">
							Optional — e.g. Google Maps link, building website.
						</p>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button
						onClick={handleSave}
						disabled={isSaving}
						data-testid="room-submit"
					>
						{isSaving && <IconLoader2 className="mr-2 size-4 animate-spin" />}
						{isEdit ? "Save" : "Create"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
