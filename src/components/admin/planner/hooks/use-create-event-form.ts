import type { EventFormProps } from "@ilamy/calendar";
import { useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAppForm } from "@/hooks/use-app-form";
import { tzLocalInputToUtc, utcToTzLocalInput } from "@/lib/tz-datetime";
import { createBreakFn } from "@/server-fns/planner/breaks";
import { allRoomsQueryOptions } from "@/server-fns/planner/rooms";
import { createSessionFn } from "@/server-fns/planner/sessions";
import { conferenceSettingsQueryOptions } from "@/server-fns/settings";
import { usePlannerTools } from "../planner-tools-context";

type EventType = "session" | "break";

interface EventFormValues {
	type: EventType;
	title: string;
	startInput: string;
	roomId: string | null;
	trackId: string | null;
	presentationCount: number;
	minutesPerPresentation: number;
	breakDurationMin: number;
}

function toDate(raw: unknown): Date | null {
	if (raw == null) return null;
	if (raw instanceof Date) return raw;
	if (
		typeof raw === "object" &&
		"toDate" in raw &&
		typeof (raw as { toDate: unknown }).toDate === "function"
	) {
		const d = (raw as { toDate: () => Date }).toDate();
		return Number.isNaN(d.getTime()) ? null : d;
	}
	if (typeof raw === "string" || typeof raw === "number") {
		const d = new Date(raw);
		return Number.isNaN(d.getTime()) ? null : d;
	}
	return null;
}

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

	const rawResourceId = selectedEvent?.resourceId;
	const resourceId =
		typeof rawResourceId === "string"
			? rawResourceId
			: typeof rawResourceId === "number"
				? String(rawResourceId)
				: undefined;

	const initialStart = toDate(selectedEvent?.start) ?? defaultStartAt;
	const clickedEnd = toDate(selectedEvent?.end);
	const clickedDurationMin =
		clickedEnd && clickedEnd.getTime() > initialStart.getTime()
			? Math.round((clickedEnd.getTime() - initialStart.getTime()) / 60_000)
			: null;

	const defaultValues: EventFormValues = {
		type: "session",
		title: "",
		startInput: utcToTzLocalInput(initialStart, timezone),
		roomId: resourceId ?? rooms[0]?.id ?? null,
		trackId: null,
		presentationCount: 4,
		minutesPerPresentation: settings.defaultPresentationMin,
		breakDurationMin:
			clickedDurationMin != null
				? Math.min(180, Math.max(5, clickedDurationMin))
				: 30,
	};

	const form = useAppForm({
		defaultValues,
		onSubmit: async ({ value }) => {
			const startDate = tzLocalInputToUtc(value.startInput, timezone);
			const trimmed = value.title.trim();
			try {
				if (value.type === "session") {
					const endDate = new Date(
						startDate.getTime() +
							value.presentationCount * value.minutesPerPresentation * 60_000,
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
					const endDate = new Date(
						startDate.getTime() + value.breakDurationMin * 60_000,
					);
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
