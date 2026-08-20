import type { EventFormProps } from "@ilamy/calendar";
import { addMinutes, differenceInMinutes, isAfter, isValid } from "date-fns";
import { z } from "zod";
import { utcToTzLocalInput } from "@/features/planner/tz-datetime";
import type { EventFormValues } from "@/features/planner/validations";

const dateBearerSchema = z.object({
	toDate: z.custom<() => Date>((fn) => fn instanceof Function),
});
const primitiveDateSchema = z.union([z.string(), z.number()]);

/** Anything ilamy hands us as a date: a Date, a dayjs-like wrapper, or a primitive. */
export type IlamyDateInput =
	| Date
	| { toDate?: unknown }
	| string
	| number
	| null
	| undefined;

/** Best-effort coercion of an ilamy date-ish value (Date, dayjs, string) to a Date. */
export function toDate(raw: IlamyDateInput): Date | null {
	if (raw == null) return null;
	if (raw instanceof Date) return raw;
	const bearer = dateBearerSchema.safeParse(raw);
	if (bearer.success) {
		const d = bearer.data.toDate();
		return isValid(d) ? d : null;
	}
	const primitive = primitiveDateSchema.safeParse(raw);
	if (!primitive.success) return null;
	const d = new Date(primitive.data);
	return isValid(d) ? d : null;
}

/** Normalizes an ilamy resource id (string | number) to a string id. */
function resolveResourceId(
	rawResourceId: string | number | null | undefined,
): string | undefined {
	const id = primitiveDateSchema.safeParse(rawResourceId);
	return id.success ? String(id.data) : undefined;
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
		untimedSlots: false,
		presentationCount: 4,
		minutesPerPresentation: input.defaultPresentationMin,
		breakDurationMin:
			clickedDurationMin != null
				? Math.min(180, Math.max(5, clickedDurationMin))
				: 30,
	};
}
