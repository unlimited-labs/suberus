import { toast } from "sonner";
import { createRoomFn, updateRoomFn } from "@/features/planner/api/rooms";
import type { RoomWithStats } from "@/features/planner/server/rooms";
import { roomSchema } from "@/features/planner/validations";
import { useAppForm } from "@/shared/hooks/use-app-form";
import { getErrorMessage } from "@/shared/lib/error-message";

interface UseRoomFormArgs {
	room?: RoomWithStats;
	onSuccess: () => void;
	onClose: () => void;
}

export function useRoomForm({ room, onSuccess, onClose }: UseRoomFormArgs) {
	const isEdit = !!room;
	const form = useAppForm({
		defaultValues: {
			name: room?.name ?? "",
			description: room?.description ?? "",
			link: room?.link ?? "",
		},
		validators: { onChange: roomSchema, onSubmit: roomSchema },
		onSubmit: async ({ value }) => {
			const payload = {
				name: value.name.trim(),
				description: value.description.trim() || null,
				link: value.link.trim() || null,
			};
			try {
				if (isEdit && room) {
					await updateRoomFn({ data: { id: room.id, ...payload } });
					toast.success("Room updated");
				} else {
					await createRoomFn({ data: payload });
					toast.success("Room created");
				}
				onSuccess();
				onClose();
			} catch (error) {
				toast.error(getErrorMessage(error, "Failed to save room"));
			}
		},
	});

	return { form, isEdit };
}
