import type { RoomWithStats } from "@/features/planner/server/rooms";
import { Button } from "@/shared/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/shared/ui/dialog";
import { useRoomForm } from "./hooks/use-room-form";

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
	const { form, isEdit } = useRoomForm({
		room,
		onSuccess,
		onClose: () => onOpenChange(false),
	});

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent data-testid="room-dialog">
				<DialogHeader>
					<DialogTitle>{isEdit ? "Edit Room" : "Create Room"}</DialogTitle>
					<DialogDescription className="sr-only">
						Configure a room's name, description and join link.
					</DialogDescription>
				</DialogHeader>

				<form
					className="space-y-4"
					noValidate
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						void form.handleSubmit();
					}}
				>
					<form.AppField name="name">
						{(field) => (
							<field.InputField
								label="Name"
								placeholder="Aula Magna, Room 101, …"
								testId="room-name"
							/>
						)}
					</form.AppField>

					<form.AppField name="description">
						{(field) => (
							<field.TextareaField
								label="Description"
								placeholder="Optional — building, floor, notes…"
								rows={2}
								testId="room-description"
							/>
						)}
					</form.AppField>

					<form.AppField name="link">
						{(field) => (
							<field.InputField
								description="Optional — e.g. Google Maps link, building website."
								label="Link"
								placeholder="https://maps.google.com/…"
								testId="room-link"
								type="url"
							/>
						)}
					</form.AppField>

					<DialogFooter>
						<Button
							onClick={() => onOpenChange(false)}
							type="button"
							variant="outline"
						>
							Cancel
						</Button>
						<form.AppForm>
							<form.SubmitButton
								label={isEdit ? "Save" : "Create"}
								testId="room-submit"
							/>
						</form.AppForm>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
