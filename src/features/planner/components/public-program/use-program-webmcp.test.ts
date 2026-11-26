import { describe, expect, it } from "vitest";
import type {
	PublicProgram,
	PublicProgramSession,
} from "@/features/planner/server/schedule";
import { searchProgram } from "./use-program-webmcp";

const settings = {
	startDate: "2026-09-14",
	endDate: "2026-09-15",
	timezone: "Europe/Warsaw",
};

function talk(
	order: number,
	title: string,
	lastName: string,
	durationMin = 15,
): PublicProgramSession["presentations"][number] {
	return {
		id: `p${order}`,
		order,
		durationMin,
		cancelled: false,
		badgeId: null,
		submissionTitle: title,
		authors: [{ firstName: "Ada", lastName, orderIndex: 0 }],
	};
}

const program: PublicProgram = {
	sessions: [
		{
			id: "s1",
			title: "Thin films",
			startAt: new Date("2026-09-14T07:00:00Z"),
			endAt: new Date("2026-09-14T08:00:00Z"),
			untimedSlots: false,
			room: { id: "r1", name: "Aula" },
			track: null,
			chairs: [{ firstName: "Jan", lastName: "Nowak" }],
			presentations: [
				talk(0, "Sputtering", "Kowalska", 20),
				talk(1, "Annealing", "Lovelace"),
			],
		},
	],
	breaks: [
		{
			id: "b1",
			kind: "BREAK",
			title: "Coffee",
			description: null,
			location: null,
			locationUrl: null,
			startAt: new Date("2026-09-14T08:00:00Z"),
			endAt: new Date("2026-09-14T08:30:00Z"),
			room: null,
		},
	],
};

describe("searchProgram", () => {
	it("returns only matching talks, with wall-clock slot times", () => {
		expect(searchProgram(program, settings, { query: "lovelace" })).toEqual({
			timezone: "Europe/Warsaw",
			conferenceDays: ["2026-09-14", "2026-09-15"],
			results: [
				{
					type: "session",
					title: "Thin films",
					start: "2026-09-14T09:00",
					end: "2026-09-14T10:00",
					room: "Aula",
					track: null,
					chairs: ["Jan Nowak"],
					talks: [
						{
							title: "Annealing",
							authors: ["Ada Lovelace"],
							start: "2026-09-14T09:20",
							durationMin: 15,
							cancelled: false,
						},
					],
				},
			],
		});
	});

	it("matches an author's full name", () => {
		const hits = searchProgram(program, settings, { query: "Ada Lovelace" });
		expect(hits.results).toMatchObject([{ talks: [{ title: "Annealing" }] }]);
	});

	it("lists breaks for a day but drops them from query hits", () => {
		const byDay = searchProgram(program, settings, { day: "2026-09-14" });
		expect(byDay.results?.map((r) => r.type)).toEqual(["session", "break"]);
		const byQuery = searchProgram(program, settings, { query: "coffee" });
		expect(byQuery.results).toEqual([]);
	});

	it("returns actionable errors instead of throwing", () => {
		expect(searchProgram(program, settings, {})).toEqual({
			error: "Pass a query or a day.",
			conferenceDays: ["2026-09-14", "2026-09-15"],
		});
		expect(searchProgram(program, settings, { day: "2026-10-01" })).toEqual({
			error: "No programme on 2026-10-01.",
			conferenceDays: ["2026-09-14", "2026-09-15"],
		});
	});
});
