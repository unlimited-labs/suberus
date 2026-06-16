import type { EventFormProps } from "@ilamy/calendar";
import { useSuspenseQuery } from "@tanstack/react-query";
import { addMinutes } from "date-fns";
import { toast } from "sonner";
import { createBreakFn } from "@/features/planner/api/breaks";
import { allRoomsQueryOptions } from "@/features/planner/api/rooms";
import { createSessionFn } from "@/features/planner/api/sessions";
import { tzLocalInputToUtc } from "@/features/planner/tz-datetime";
import { eventFormSchema } from "@/features/planner/validations";
import { conferenceSettingsQueryOptions } from "@/features/settings/api/settings";
import { useAppForm } from "@/shared/hooks/use-app-form";
import { usePlannerTools } from "../planner-tools-context";
import { buildEventFormDefaults } from "./create-event-form-helpers";

interface UseCreateEventFormArgs {
	selectedEvent: EventFormProps["selectedEvent"];
	timezone?: string;
	onClose: () => void;
}

export function useCreateEventForm({
	selectedEvent,
	timezone,
	onClose,
}: UseCreateEventFormArgs) {
	const { defaultStartAt, onCreated } = usePlannerTools();
	const { data: rooms } = useSuspenseQuery(allRoomsQueryOptions());
	const { data: settings } = useSuspenseQuery(conferenceSettingsQueryOptions());

	const defaultValues = buildEventFormDefaults({
		selectedEvent,
		timezone,
		defaultStartAt,
		rooms,
		defaultPresentationMin: settings.defaultPresentationMin,
	});

	const form = useAppForm({
		defaultValues,
		validators: {
			onChange: eventFormSchema,
			onSubmit: eventFormSchema,
		},
		onSubmit: async ({ value }) => {
			const startDate = tzLocalInputToUtc(value.startInput, timezone);
			const trimmed = value.title.trim();
			try {
				if (value.type === "session") {
					const endDate = addMinutes(
						startDate,
						value.presentationCount * value.minutesPerPresentation,
					);
					await createSessionFn({
						data: {
							title: trimmed || undefined,
							roomId: value.roomId,
							trackId: value.trackId,
							startAt: startDate.toISOString(),
							endAt: endDate.toISOString(),
						},
					});
				} else {
					const endDate = addMinutes(startDate, value.breakDurationMin);
					await createBreakFn({
						data: {
							title: trimmed,
							roomId: value.roomId,
							startAt: startDate.toISOString(),
							endAt: endDate.toISOString(),
						},
					});
				}
				onCreated();
				handleClose();
			} catch (e) {
				toast.error(e instanceof Error ? e.message : "Failed to create");
			}
		},
	});

	const handleClose = () => {
		form.reset();
		onClose();
	};

	return { form, handleClose };
}
