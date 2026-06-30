import { toast } from "sonner";
import {
	createProgramTrackFn,
	updateProgramTrackFn,
} from "@/features/planner/api/tracks";
import type { ProgramTrackWithStats } from "@/features/planner/server/tracks";
import { trackSchema } from "@/features/planner/validations";
import { useAppForm } from "@/shared/hooks/use-app-form";
import { getErrorMessage } from "@/shared/lib/error-message";

interface UseTrackFormArgs {
	track?: ProgramTrackWithStats;
	onSuccess: () => void;
	onClose: () => void;
}

export function useTrackForm({ track, onSuccess, onClose }: UseTrackFormArgs) {
	const isEdit = !!track;
	const form = useAppForm({
		defaultValues: {
			name: track?.name ?? "",
			color: track?.color ?? "",
		},
		validators: { onChange: trackSchema, onSubmit: trackSchema },
		onSubmit: async ({ value }) => {
			const name = value.name.trim();
			const color = value.color || null;
			try {
				if (isEdit && track) {
					await updateProgramTrackFn({ data: { id: track.id, name, color } });
					toast.success("Program track updated");
				} else {
					await createProgramTrackFn({ data: { name, color } });
					toast.success("Program track created");
				}
				onSuccess();
				onClose();
			} catch (error) {
				toast.error(getErrorMessage(error, "Failed to save track"));
			}
		},
	});

	return { form, isEdit };
}
