import { useSuspenseQuery } from "@tanstack/react-query";
import { addMinutes } from "date-fns";
import { toast } from "sonner";
import { allRoomsQueryOptions } from "@/features/planner/api/rooms";
import { createSessionWithPresentationsFn } from "@/features/planner/api/sessions";
import {
	type SessionFormValues,
	sessionFormSchema,
} from "@/features/planner/validations";
import { conferenceSettingsQueryOptions } from "@/features/settings/api/settings";
import { useAppForm } from "@/shared/hooks/use-app-form";

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
		untimedSlots: false,
		sessionMin: 120,
	};

	const form = useAppForm({
		defaultValues,
		validators: {
			onChange: sessionFormSchema,
			onSubmit: sessionFormSchema,
		},
		onSubmit: async ({ value }) => {
			const durationMin = value.untimedSlots
				? value.sessionMin
				: submissionIds.length * value.slotMin;
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
						untimedSlots: value.untimedSlots,
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
