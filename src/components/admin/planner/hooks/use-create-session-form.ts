import { useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAppForm } from "@/hooks/use-app-form";
import { allRoomsQueryOptions } from "@/server-fns/planner/rooms";
import { createSessionWithPresentationsFn } from "@/server-fns/planner/sessions";
import { conferenceSettingsQueryOptions } from "@/server-fns/settings";

interface SessionFormValues {
	title: string;
	roomId: string | null;
	trackId: string | null;
	slotMin: number;
}

interface UseCreateSessionFormArgs {
	submissionIds: string[];
	defaultStartAt: Date;
	onClose: () => void;
	onCreated: (sessionId: string) => void;
}

export function useCreateSessionForm({
	submissionIds,
	defaultStartAt,
	onClose,
	onCreated,
}: UseCreateSessionFormArgs) {
	const { data: rooms } = useSuspenseQuery(allRoomsQueryOptions());
	const { data: settings } = useSuspenseQuery(conferenceSettingsQueryOptions());

	const defaultValues: SessionFormValues = {
		title: "",
		roomId: rooms[0]?.id ?? null,
		trackId: null,
		slotMin: settings.defaultPresentationMin,
	};

	const form = useAppForm({
		defaultValues,
		onSubmit: async ({ value }) => {
			const durationMin = submissionIds.length * value.slotMin;
			const endAt = new Date(defaultStartAt.getTime() + durationMin * 60_000);
			try {
				const { id } = await createSessionWithPresentationsFn({
					data: {
						title: value.title.trim(),
						roomId: value.roomId,
						trackId: value.trackId,
						startAt: defaultStartAt.toISOString(),
						endAt: endAt.toISOString(),
						slotDurationMin: value.slotMin,
						submissionIds,
					},
				});
				onCreated(id);
				handleClose();
			} catch (e) {
				toast.error(
					e instanceof Error ? e.message : "Failed to create session",
				);
			}
		},
	});

	const handleClose = () => {
		form.reset();
		onClose();
	};

	return { form, handleClose };
}
