import { useWebMCP } from "use-webmcp-tool";
import { z } from "zod";
import type { PublicConferenceInfo } from "@/features/planner/api/schedule";
import type {
	PublicProgram,
	PublicProgramSession,
} from "@/features/planner/server/schedule";
import { slotStartAt } from "@/features/planner/slot-timing";
import { programDay } from "@/features/planner/validations";
import { utcToWallClock, zonedDateString } from "@/shared/lib/zoned";
import type { ProgramItem } from "./program-types";
import {
	conferenceDays,
	isSearchHit,
	presentationMatches,
	programItemsForDay,
	sessionSelfMatches,
} from "./use-program-schedule";

const searchProgramInput = z.object({
	query: z
		.string()
		.optional()
		.describe(
			"Words to find in session, talk, track, author or social-event names.",
		),
	day: programDay
		.optional()
		.describe("Conference day, read in the conference time zone."),
});

const SEARCH_PROGRAM_SCHEMA = z.toJSONSchema(searchProgramInput);
// Talk titles and author names are user-submitted.
const READ_ONLY_UNTRUSTED = { readOnlyHint: true, untrustedContentHint: true };

const fullName = (p: { firstName: string | null; lastName: string | null }) =>
	[p.firstName, p.lastName].filter(Boolean).join(" ");

function sessionForAgent(s: PublicProgramSession, q: string, tz: string) {
	const sessionStart = new Date(s.startAt);
	const showAll = !q || sessionSelfMatches(s, q);
	return {
		type: "session",
		title: s.title,
		start: utcToWallClock(sessionStart, tz),
		end: utcToWallClock(new Date(s.endAt), tz),
		room: s.room?.name ?? null,
		track: s.track?.name ?? null,
		chairs: s.chairs.map(fullName),
		talks: s.presentations
			.filter((p) => showAll || presentationMatches(p, q))
			.map((p) => ({
				title: p.submissionTitle,
				authors: p.authors.map(fullName),
				start: s.untimedSlots
					? null
					: utcToWallClock(
							slotStartAt(sessionStart, s.presentations, p.order),
							tz,
						),
				durationMin: p.durationMin,
				cancelled: p.cancelled,
			})),
	};
}

function itemForAgent(item: ProgramItem, q: string, tz: string) {
	if (item.kind === "session") return sessionForAgent(item.data, q, tz);
	const b = item.data;
	return {
		type: b.kind === "EVENT" ? "event" : "break",
		title: b.title,
		start: utcToWallClock(new Date(b.startAt), tz),
		end: utcToWallClock(new Date(b.endAt), tz),
		room: b.room?.name ?? null,
		location: b.location,
		description: b.description,
	};
}

export function searchProgram(
	program: PublicProgram,
	settings: Pick<PublicConferenceInfo, "startDate" | "endDate" | "timezone">,
	input: z.infer<typeof searchProgramInput>,
) {
	const tz = settings.timezone || "UTC";
	const days = conferenceDays(settings, tz);
	const dayKeys = days.map((d) => zonedDateString(d, tz));
	const q = input.query?.toLowerCase().trim() ?? "";
	const { day } = input;
	if (!q && !day) {
		return { error: "Pass a query or a day.", conferenceDays: dayKeys };
	}
	const dayIndex = day ? dayKeys.indexOf(day) : -1;
	if (day && dayIndex === -1) {
		return { error: `No programme on ${day}.`, conferenceDays: dayKeys };
	}
	const searchDays = day ? [days[dayIndex]] : days;
	const results = searchDays
		.flatMap((d) => programItemsForDay(program, d, tz, q))
		.filter((item) => !q || isSearchHit(item))
		.map((item) => itemForAgent(item, q, tz));
	return { timezone: tz, conferenceDays: dayKeys, results };
}

export function useProgramWebMcp(
	program: PublicProgram | null,
	settings: PublicConferenceInfo,
) {
	useWebMCP({
		name: "search-program",
		description:
			"Searches this conference's programme. Use to find when and where a session, talk, author or social event is scheduled.",
		inputSchema: SEARCH_PROGRAM_SCHEMA,
		annotations: READ_ONLY_UNTRUSTED,
		enabled: program !== null,
		execute: (args) => {
			const parsed = searchProgramInput.safeParse(args);
			if (!parsed.success) return { error: z.prettifyError(parsed.error) };
			return program
				? searchProgram(program, settings, parsed.data)
				: { results: [] };
		},
	});
}
