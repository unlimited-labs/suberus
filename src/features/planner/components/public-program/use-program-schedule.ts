import { compareAsc, eachDayOfInterval } from "date-fns";
import type { PublicConferenceInfo } from "@/features/planner/api/schedule";
import type {
	PublicProgram,
	PublicProgramSession,
} from "@/features/planner/server/schedule";
import { sameDayInTz } from "@/features/planner/tz-datetime";
import { buildTimeGroups } from "./program-formatting";
import type { ProgramItem } from "./program-types";

interface UseProgramScheduleArgs {
	program: PublicProgram | null;
	settings: PublicConferenceInfo;
	search: string;
	activeDay: number;
}

export function sessionSelfMatches(
	s: PublicProgramSession,
	q: string,
): boolean {
	if (!q) return true;
	return (
		s.title.toLowerCase().includes(q) ||
		(s.track?.name.toLowerCase().includes(q) ?? false)
	);
}

export function presentationMatches(
	p: PublicProgramSession["presentations"][number],
	q: string,
): boolean {
	if (!q) return true;
	return (
		p.submissionTitle.toLowerCase().includes(q) ||
		p.authors.some(
			(a) =>
				a.firstName.toLowerCase().includes(q) ||
				a.lastName.toLowerCase().includes(q),
		)
	);
}

function isSearchHit(item: ProgramItem): boolean {
	return item.kind === "session" || item.data.kind === "EVENT";
}

export function useProgramSchedule({
	program,
	settings,
	search,
	activeDay,
}: UseProgramScheduleArgs) {
	const tz = settings.timezone || undefined;
	const days =
		settings.startDate && settings.endDate
			? eachDayOfInterval({
					start: new Date(settings.startDate),
					end: new Date(settings.endDate),
				})
			: [];

	const q = search.toLowerCase().trim();

	const sessionMatches = (s: PublicProgramSession): boolean =>
		!q ||
		sessionSelfMatches(s, q) ||
		s.presentations.some((p) => presentationMatches(p, q));

	const breakMatches = (b: PublicProgram["breaks"][number]): boolean => {
		if (!q) return true;
		if (b.kind !== "EVENT") return true;
		return (
			b.title.toLowerCase().includes(q) ||
			(b.description?.toLowerCase().includes(q) ?? false) ||
			(b.location?.toLowerCase().includes(q) ?? false)
		);
	};

	const itemsForDay = (day: Date): ProgramItem[] => {
		if (!program) return [];
		const sessions = program.sessions.filter(
			(s) => sameDayInTz(new Date(s.startAt), day, tz) && sessionMatches(s),
		);
		const breaks = program.breaks.filter(
			(b) => sameDayInTz(new Date(b.startAt), day, tz) && breakMatches(b),
		);
		const all: ProgramItem[] = [
			...sessions.map((s) => ({ kind: "session" as const, data: s })),
			...breaks.map((b) => ({ kind: "break" as const, data: b })),
		];
		return all.sort((a, b) =>
			compareAsc(new Date(a.data.startAt), new Date(b.data.startAt)),
		);
	};

	const activeItems =
		days.length > 0 ? itemsForDay(days[activeDay]) : itemsForDay(new Date());
	const groups = buildTimeGroups(activeItems);

	const countHits = (items: ProgramItem[]) => items.filter(isSearchHit).length;

	const dayMatchCounts = q ? days.map((d) => countHits(itemsForDay(d))) : [];
	const activeMatchCount = q ? countHits(activeItems) : 0;

	return {
		tz,
		days,
		q,
		activeItems,
		groups,
		dayMatchCounts,
		activeMatchCount,
	};
}
