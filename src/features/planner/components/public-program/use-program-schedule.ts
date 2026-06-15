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

/**
 * Derives the public program view for the active day: conference days, the
 * normalized search query, the day's matching session/break items and their
 * time-grouped layout. Returns empty collections when no program is published.
 */
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

	const sessionMatches = (s: PublicProgramSession): boolean => {
		if (!q) return true;
		if (s.title.toLowerCase().includes(q)) return true;
		if (s.track?.name.toLowerCase().includes(q)) return true;
		return s.presentations.some(
			(p) =>
				p.submissionTitle.toLowerCase().includes(q) ||
				p.authors.some(
					(a) =>
						a.firstName.toLowerCase().includes(q) ||
						a.lastName.toLowerCase().includes(q),
				),
		);
	};

	const itemsForDay = (day: Date): ProgramItem[] => {
		if (!program) return [];
		const sessions = program.sessions
			.filter((s) => sameDayInTz(new Date(s.startAt), day, tz))
			.filter(sessionMatches);
		const breaks = program.breaks.filter((b) =>
			sameDayInTz(new Date(b.startAt), day, tz),
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

	return { tz, days, q, activeItems, groups };
}
