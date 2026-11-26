import { compareAsc } from "date-fns";
import type { PublicConferenceInfo } from "@/features/planner/api/schedule";
import type {
	PublicProgram,
	PublicProgramSession,
} from "@/features/planner/server/schedule";
import {
	eachDayInZone,
	sameDayInZone,
	startOfDayInZone,
} from "@/shared/lib/zoned";
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
		p.authors.some((a) =>
			`${a.firstName} ${a.lastName}`.toLowerCase().includes(q),
		)
	);
}

export function isSearchHit(item: ProgramItem): boolean {
	return item.kind === "session" || item.data.kind === "EVENT";
}

function sessionMatches(s: PublicProgramSession, q: string): boolean {
	return (
		!q ||
		sessionSelfMatches(s, q) ||
		s.presentations.some((p) => presentationMatches(p, q))
	);
}

function breakMatches(b: PublicProgram["breaks"][number], q: string): boolean {
	if (!q) return true;
	if (b.kind !== "EVENT") return true;
	return (
		b.title.toLowerCase().includes(q) ||
		(b.description?.toLowerCase().includes(q) ?? false) ||
		(b.location?.toLowerCase().includes(q) ?? false)
	);
}

export function programItemsForDay(
	program: PublicProgram,
	day: Date,
	tz: string,
	q: string,
): ProgramItem[] {
	const sessions = program.sessions.filter(
		(s) => sameDayInZone(new Date(s.startAt), day, tz) && sessionMatches(s, q),
	);
	const breaks = program.breaks.filter(
		(b) => sameDayInZone(new Date(b.startAt), day, tz) && breakMatches(b, q),
	);
	const all: ProgramItem[] = [
		...sessions.map((s) => ({ kind: "session" as const, data: s })),
		...breaks.map((b) => ({ kind: "break" as const, data: b })),
	];
	return all.sort((a, b) =>
		compareAsc(new Date(a.data.startAt), new Date(b.data.startAt)),
	);
}

export function conferenceDays(
	settings: Pick<PublicConferenceInfo, "startDate" | "endDate">,
	tz: string,
): Date[] {
	return settings.startDate && settings.endDate
		? eachDayInZone(
				startOfDayInZone(settings.startDate, tz),
				startOfDayInZone(settings.endDate, tz),
				tz,
			)
		: [];
}

export function useProgramSchedule({
	program,
	settings,
	search,
	activeDay,
}: UseProgramScheduleArgs) {
	const tzName = settings.timezone || "UTC";
	const days = conferenceDays(settings, tzName);

	const q = search.toLowerCase().trim();

	const itemsForDay = (day: Date): ProgramItem[] =>
		program ? programItemsForDay(program, day, tzName, q) : [];

	const activeItems =
		days.length > 0 ? itemsForDay(days[activeDay]) : itemsForDay(new Date());
	const groups = buildTimeGroups(activeItems);

	const countHits = (items: ProgramItem[]) => items.filter(isSearchHit).length;

	const dayMatchCounts = q ? days.map((d) => countHits(itemsForDay(d))) : [];
	const activeMatchCount = q ? countHits(activeItems) : 0;

	return {
		tz: tzName,
		days,
		q,
		activeItems,
		groups,
		dayMatchCounts,
		activeMatchCount,
	};
}
