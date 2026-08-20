import {
	addMinutes,
	formatDurationMin,
	tzLocalInputToUtc,
	utcToTzLocalInput,
} from "@/features/planner/tz-datetime";
import { breakEditSchema } from "@/features/planner/validations";
import { useAppForm } from "@/shared/hooks/use-app-form";
import type { PlannerBreak } from "../types";
import type { useBreakEditorMutations } from "./use-break-editor-mutations";

type Mutations = ReturnType<typeof useBreakEditorMutations>;

function breakFormDefaults(
	breakItem: PlannerBreak | undefined,
	tz: string | undefined,
) {
	if (!breakItem) {
		// SAFETY: seeds the field so a later string edit is not rejected as a literal-null mismatch.
		return {
			kind: "BREAK" as const,
			title: "",
			startLocal: "",
			endLocal: "",
			durationMin: 0,
			description: "",
			location: "",
			locationUrl: "",
			roomId: null as string | null,
		};
	}
	return {
		kind: breakItem.kind,
		title: breakItem.title,
		startLocal: utcToTzLocalInput(new Date(breakItem.startAt), tz),
		endLocal: utcToTzLocalInput(new Date(breakItem.endAt), tz),
		durationMin: formatDurationMin(
			new Date(breakItem.startAt),
			new Date(breakItem.endAt),
		),
		description: breakItem.description ?? "",
		location: breakItem.location ?? "",
		locationUrl: breakItem.locationUrl ?? "",
		roomId: breakItem.roomId,
	};
}

type BreakFormValue = ReturnType<typeof breakFormDefaults>;

function buildBreakUpdate(value: BreakFormValue, tz: string | undefined) {
	const isEvent = value.kind === "EVENT";
	const startAt = tzLocalInputToUtc(value.startLocal, tz);
	const endAt =
		isEvent && value.endLocal
			? tzLocalInputToUtc(value.endLocal, tz)
			: addMinutes(startAt, Math.max(1, value.durationMin));
	const eventText = (s: string) => (isEvent ? s.trim() || null : null);
	return {
		title: value.title,
		description: eventText(value.description),
		location: eventText(value.location),
		locationUrl: eventText(value.locationUrl),
		startAt: startAt.toISOString(),
		endAt: endAt.toISOString(),
		roomId: isEvent ? null : value.roomId,
	};
}

export function useBreakEditorForm(
	breakItem: PlannerBreak | undefined,
	tz: string | undefined,
	mutations: Mutations,
) {
	const form = useAppForm({
		defaultValues: breakFormDefaults(breakItem, tz),
		validators: { onChange: breakEditSchema, onSubmit: breakEditSchema },
		onSubmit: async ({ value }) => {
			const result = await mutations.updateHeader(buildBreakUpdate(value, tz));
			if (result !== null) form.reset(value);
		},
	});
	return form;
}
