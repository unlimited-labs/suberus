import type { EventFormProps } from "@ilamy/calendar";
import { addMinutes, differenceInMinutes, isAfter, isValid } from "date-fns";
import { utcToTzLocalInput } from "@/features/planner/tz-datetime";
import type { EventFormValues } from "@/features/planner/validations";

/** Best-effort coercion of an ilamy date-ish value (Date, dayjs, string) to a Date. */
export function toDate(raw: unknown): Date | null {
	if (raw == null) return null;
	if (raw instanceof Date) return raw;
	if (
		typeof raw === "object" &&
		"toDate" in raw &&
		typeof (raw as { toDate: unknown }).toDate === "function"
	) {
		const d = (raw as { toDate: () => Date }).toDate();
		return isValid(d) ? d : null;
	}
	if (typeof raw === "string" || typeof raw === "number") {
		const d = new Date(raw);
		return isValid(d) ? d : null;
	}
	return null;
}

/** Normalizes an ilamy resource id (string | number) to a string id. */
function resolveResourceId(rawResourceId: unknown): string | undefined {
	if (typeof rawResourceId === "string") return rawResourceId;
	if (typeof rawResourceId === "number") return String(rawResourceId);
	return undefined;
}

interface EventFormDefaultsInput {
	selectedEvent: EventFormProps["selectedEvent"];
	timezone?: string;
	defaultStartAt: Date;
	rooms: { id: string }[];
	defaultPresentationMin: number;
}

/**
 * Seeds the create-event form from a calendar click: the clicked slot's room and
 * start, a break duration derived from the dragged span (clamped 5–180min), and
 * sensible session defaults. Pure, so the seeding rules are unit-testable.
 */
export function buildEventFormDefaults(
	input: EventFormDefaultsInput,
): EventFormValues {
	const resourceId = resolveResourceId(input.selectedEvent?.resourceId);
	const initialStart =
		toDate(input.selectedEvent?.start) ?? input.defaultStartAt;
	const clickedEnd = toDate(input.selectedEvent?.end);
	const clickedDurationMin =
		clickedEnd && isAfter(clickedEnd, initialStart)
			? differenceInMinutes(clickedEnd, initialStart)
			: null;
	const initialEnd =
		clickedEnd && isAfter(clickedEnd, initialStart)
			? clickedEnd
			: addMinutes(initialStart, 60);

	return {
		type: "session",
		title: "",
		startInput: utcToTzLocalInput(initialStart, input.timezone),
		endInput: utcToTzLocalInput(initialEnd, input.timezone),
		description: "",
		location: "",
		locationUrl: "",
		roomId: resourceId ?? input.rooms[0]?.id ?? null,
		trackId: null,
		presentationCount: 4,
		minutesPerPresentation: input.defaultPresentationMin,
		breakDurationMin:
			clickedDurationMin != null
				? Math.min(180, Math.max(5, clickedDurationMin))
				: 30,
	};
}
