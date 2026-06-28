import { describe, expect, it } from "vitest";
import { computePlaceholders, type PlaceholderInput } from "./placeholders";

const base: PlaceholderInput = {
	firstName: "Ada",
	lastName: "Lovelace",
	email: "ada@example.com",
	affiliationName: "Analytical Society",
	acceptedTitles: ["On the Engine"],
	date: "26.06.2026",
};

describe("computePlaceholders", () => {
	it("resolves all keys when data is complete", () => {
		const { values, missing } = computePlaceholders(base);
		expect(values).toEqual({
			firstName: "Ada",
			lastName: "Lovelace",
			affiliation: "Analytical Society",
			abstractTitle: "On the Engine",
			email: "ada@example.com",
			date: "26.06.2026",
		});
		expect(missing).toEqual([]);
	});

	it("joins multiple accepted titles with ', '", () => {
		const { values } = computePlaceholders({
			...base,
			acceptedTitles: ["First", "Second", "Third"],
		});
		expect(values.abstractTitle).toBe("First, Second, Third");
	});

	it("flags abstractTitle missing when there are no accepted submissions", () => {
		const { values, missing } = computePlaceholders({
			...base,
			acceptedTitles: [],
		});
		expect(values.abstractTitle).toBe("");
		expect(missing).toContain("abstractTitle");
	});

	it("flags affiliation missing when unset/blank", () => {
		const { missing } = computePlaceholders({ ...base, affiliationName: "  " });
		expect(missing).toContain("affiliation");
	});

	it("trims values and ignores blank titles in the join", () => {
		const { values } = computePlaceholders({
			...base,
			firstName: "  Ada  ",
			acceptedTitles: ["A", "   ", "B"],
		});
		expect(values.firstName).toBe("Ada");
		expect(values.abstractTitle).toBe("A, B");
	});
});
