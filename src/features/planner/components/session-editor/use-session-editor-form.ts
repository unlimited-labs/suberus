import {
	addMinutes,
	formatDurationMin,
	tzLocalInputToUtc,
	utcToTzLocalInput,
} from "@/features/planner/tz-datetime";
import { sessionEditSchema } from "@/features/planner/validations";
import { useAppForm } from "@/shared/hooks/use-app-form";
import type { PlannerSession } from "../types";
import type { useSessionEditorMutations } from "./use-session-editor-mutations";

type Mutations = ReturnType<typeof useSessionEditorMutations>;

function sessionFormDefaults(
	session: PlannerSession | undefined,
	tz: string | undefined,
	defaultPresentationMin: number,
) {
	if (!session) {
		// SAFETY: seeds the field so a later string edit is not rejected as a literal-null mismatch.
		return {
			title: "",
			startLocal: "",
			endLocal: "",
			untimedSlots: false,
			slotCount: 1,
			slotMin: defaultPresentationMin,
			roomId: null as string | null,
			trackId: null as string | null,
		};
	}
	const durationMin = formatDurationMin(
		new Date(session.startAt),
		new Date(session.endAt),
	);
	const slotMin =
		session.presentations.toSorted((a, b) => a.order - b.order)[0]
			?.durationMin ?? defaultPresentationMin;
	return {
		title: session.title,
		startLocal: utcToTzLocalInput(new Date(session.startAt), tz),
		endLocal: utcToTzLocalInput(new Date(session.endAt), tz),
		untimedSlots: session.untimedSlots,
		slotCount: Math.max(1, Math.round(durationMin / Math.max(1, slotMin))),
		slotMin,
		roomId: session.roomId,
		trackId: session.trackId,
	};
}

export function useSessionEditorForm(
	session: PlannerSession | undefined,
	tz: string | undefined,
	defaultPresentationMin: number,
	mutations: Mutations,
) {
	const form = useAppForm({
		defaultValues: sessionFormDefaults(session, tz, defaultPresentationMin),
		validators: { onChange: sessionEditSchema, onSubmit: sessionEditSchema },
		onSubmit: async ({ value }) => {
			const startAt = tzLocalInputToUtc(value.startLocal, tz);
			const endAt = value.untimedSlots
				? tzLocalInputToUtc(value.endLocal, tz)
				: addMinutes(startAt, Math.max(1, value.slotCount * value.slotMin));
			const result = await mutations.updateHeader({
				title: value.title,
				startAt: startAt.toISOString(),
				endAt: endAt.toISOString(),
				roomId: value.roomId,
				trackId: value.trackId,
				untimedSlots: value.untimedSlots,
			});
			if (result !== null) form.reset(value);
		},
	});
	return form;
}
