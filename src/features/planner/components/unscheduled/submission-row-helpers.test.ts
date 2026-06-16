import { describe, expect, it } from "vitest";
import type { UnscheduledSubmission } from "@/features/planner/server/sessions";
import {
	formatAuthorsSummary,
	submissionRowClassName,
	typeLabel,
} from "./submission-row-helpers";

type Authors = UnscheduledSubmission["authors"];
const author = (firstName: string, lastName: string) =>
	({ firstName, lastName }) as Authors[number];

describe("typeLabel", () => {
	it("maps known types and falls back to the raw code", () => {
		expect(typeLabel("ABSTRACT")).toBe("Oral");
		expect(typeLabel("FULL_PAPER")).toBe("Paper");
		expect(typeLabel("POSTER")).toBe("Poster");
		expect(typeLabel("EXHIBITOR")).toBe("EXHIBITOR");
	});
});

describe("formatAuthorsSummary", () => {
	it("joins up to three authors", () => {
		expect(
			formatAuthorsSummary([
				author("Ada", "Lovelace"),
				author("Alan", "Turing"),
			]),
		).toBe("Ada Lovelace, Alan Turing");
	});

	it("adds a +N suffix beyond three", () => {
		expect(
			formatAuthorsSummary([
				author("A", "A"),
				author("B", "B"),
				author("C", "C"),
				author("D", "D"),
				author("E", "E"),
			]),
		).toBe("A A, B B, C C +2");
	});

	it("is empty with no authors", () => {
		expect(formatAuthorsSummary([])).toBe("");
	});
});

describe("submissionRowClassName", () => {
	const base = { dragging: false, selected: false, leaving: false };

	it("applies drag and selected modifiers", () => {
		expect(submissionRowClassName({ ...base, dragging: true })).toContain(
			"opacity-40",
		);
		expect(submissionRowClassName({ ...base, selected: true })).toContain(
			"bg-primary/5",
		);
	});

	it("collapses out while leaving, else keeps max height", () => {
		expect(submissionRowClassName({ ...base, leaving: true })).toContain(
			"max-h-0",
		);
		expect(submissionRowClassName(base)).toContain("max-h-60");
	});
});
