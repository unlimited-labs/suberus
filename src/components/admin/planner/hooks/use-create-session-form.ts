import { useSuspenseQuery } from "@tanstack/react-query";
import { addMinutes } from "date-fns";
import { toast } from "sonner";
import { useAppForm } from "@/hooks/use-app-form";
import {
	type SessionFormValues,
	sessionFormSchema,
} from "@/lib/validations/planner";
import { allRoomsQueryOptions } from "@/server-fns/planner/rooms";
import { createSessionWithPresentationsFn } from "@/server-fns/planner/sessions";
import { conferenceSettingsQueryOptions } from "@/server-fns/settings";

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
		validators: {
			onChange: sessionFormSchema,
			onSubmit: sessionFormSchema,
		},
		onSubmit: async ({ value }) => {
			const durationMin = submissionIds.length * value.slotMin;
			const endAt = addMinutes(defaultStartAt, durationMin);
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
