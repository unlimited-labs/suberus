import { describe, expect, it } from "vitest";
import type { DocParagraph, DocRun } from "./docx-parser";
import {
	cleanName,
	extractAuthorSegments,
	extractAcknowledgment,
	extractAuthors,
	extractEmails,
	extractFromZones,
	parseAffiliations,
	parseName,
} from "./extraction-heuristic";
import type { ClassifiedPara } from "./extraction-zones";

const p = (text: string, runs?: DocRun[]): DocParagraph => ({
	text,
	runs: runs ?? [{ text }],
});

// Zone is irrelevant to these parsers — they only read `.para`.
const cp = (text: string, runs?: DocRun[]): ClassifiedPara => ({
	zone: "AFFILIATIONS",
	para: p(text, runs),
});

const titlePara = (text: string): ClassifiedPara => ({
	zone: "TITLE",
	para: p(text),
});

describe("extractFromZones", () => {
	it("joins title paragraphs and collapses runs of whitespace", () => {
		const result = extractFromZones([
			titlePara("Is thinner better?"),
			titlePara("The  influence of layer	thickness"),
		]);
		expect(result.title).toBe(
			"Is thinner better? The influence of layer thickness",
		);
	});
});

describe("parseAffiliations", () => {
	it("parses a numeric-marked affiliation", () => {
		const map = parseAffiliations([cp("1 University of Warsaw")]);
		expect(Object.fromEntries(map)).toEqual({ "1": "University of Warsaw" });
	});

	it("parses a symbol-marked affiliation", () => {
		const map = parseAffiliations([cp("† Institute of Physics")]);
		expect(Object.fromEntries(map)).toEqual({ "†": "Institute of Physics" });
	});

	it("parses an unmarked affiliation with sequential key", () => {
		const map = parseAffiliations([
			cp("Jagiellonian University"),
			cp("Warsaw Institute"),
		]);
		expect(Object.fromEntries(map)).toEqual({
			_unmarked_0: "Jagiellonian University",
			_unmarked_1: "Warsaw Institute",
		});
	});

	it("appends a postal-code-only line to the previous affiliation", () => {
		const map = parseAffiliations([
			cp("1 University of Warsaw"),
			cp("00-001 Warszawa, Poland"),
		]);
		expect(map.get("1")).toBe("University of Warsaw, 00-001 Warszawa, Poland");
	});

	it("strips an email suffix from a marked affiliation", () => {
		const map = parseAffiliations([
			cp("2 Institute of Physics, e-mail: a@b.com"),
		]);
		expect(map.get("2")).toBe("Institute of Physics");
	});

	it("strips an email suffix from an unmarked affiliation", () => {
		const map = parseAffiliations([
			cp("Jagiellonian University; email: x@y.com"),
		]);
		expect(map.get("_unmarked_0")).toBe("Jagiellonian University");
	});

	it("skips correspondence lines", () => {
		const map = parseAffiliations([cp("Correspondence: jan@uw.edu.pl")]);
		expect(map.size).toBe(0);
	});

	it("ignores unmarked lines without an institution keyword", () => {
		const map = parseAffiliations([cp("just some random text")]);
		expect(map.size).toBe(0);
	});
});

describe("extractEmails", () => {
	it("extracts and lowercases unique emails", () => {
		expect(extractEmails([cp("Jan@UW.edu.pl, anna@uw.edu.pl")])).toEqual([
			"jan@uw.edu.pl",
			"anna@uw.edu.pl",
		]);
	});

	it("expands curly-brace shorthand", () => {
		expect(extractEmails([cp("{a,b}@example.com")])).toEqual([
			"a@example.com",
			"b@example.com",
		]);
	});

	it("returns an empty array when no emails present", () => {
		expect(extractEmails([cp("no contact here")])).toEqual([]);
	});
});

describe("extractAuthorSegments", () => {
	it("returns an empty array for a paragraph with no runs", () => {
		expect(extractAuthorSegments(p("", []))).toEqual([]);
	});

	it("merges superscript markers and splits comma-separated authors", () => {
		const segments = extractAuthorSegments(
			p("Korpala1,2, Bzowski3", [
				{ text: "Korpala" },
				{ text: "1,2", superscript: true },
				{ text: ", Bzowski" },
				{ text: "3", superscript: true },
			]),
		);
		expect(segments).toEqual([
			{ name: "Korpala", markers: ["1", "2"] },
			{ name: "Bzowski", markers: ["3"] },
		]);
	});

	it("detects a new author after a superscript without a comma", () => {
		const segments = extractAuthorSegments(
			p("Karbowniczek1 Pradeep2", [
				{ text: "Karbowniczek" },
				{ text: "1", superscript: true },
				{ text: " Pradeep" },
				{ text: "2", superscript: true },
			]),
		);
		expect(segments).toEqual([
			{ name: "Karbowniczek", markers: ["1"] },
			{ name: "Pradeep", markers: ["2"] },
		]);
	});

	it("handles a single unmarked author", () => {
		const segments = extractAuthorSegments(p("Jan Kowalski"));
		expect(segments).toEqual([{ name: "Jan Kowalski", markers: [] }]);
	});
});

describe("extractAuthors", () => {
	it("links a single shared affiliation across authors and assigns emails by position", () => {
		const authors = extractAuthors(
			[cp("Jan Kowalski")],
			new Map([["1", "University X"]]),
			["jan@x.com"],
		);
		expect(authors).toEqual([
			{
				firstName: "Jan",
				lastName: "Kowalski",
				email: "jan@x.com",
				affiliationName: "University X",
			},
		]);
	});

	it("joins multiple marker affiliations", () => {
		const authors = extractAuthors(
			[
				cp("Jan Kowalski1,2", [
					{ text: "Jan Kowalski" },
					{ text: "1,2", superscript: true },
				]),
			],
			new Map([
				["1", "Inst A"],
				["2", "Inst B"],
			]),
			["jan@x.com"],
		);
		expect(authors[0].affiliationName).toBe("Inst A; Inst B");
	});

	it("skips segments whose name fails to parse", () => {
		const authors = extractAuthors([cp("X")], new Map(), []);
		expect(authors).toEqual([]);
	});
});

describe("parseName", () => {
	it("splits first and last name", () => {
		expect(parseName("Jan Kowalski")).toEqual({
			firstName: "Jan",
			lastName: "Kowalski",
		});
	});

	it("rejects single words and lowercase-led names", () => {
		expect(parseName("Jan")).toBeNull();
		expect(parseName("jan kowalski")).toBeNull();
	});
});

describe("cleanName", () => {
	it("removes affiliation markers and normalizes whitespace", () => {
		expect(cleanName("Jan*† Kowalski")).toBe("Jan Kowalski");
	});
});

describe("extractAcknowledgment", () => {
	const ack = (text: string): ClassifiedPara => ({
		zone: "ACKNOWLEDGMENT",
		para: p(text),
	});

	it("strips the inline heading", () => {
		expect(
			extractAcknowledgment([ack("Acknowledgments: Funded by NCN.")]),
		).toBe("Funded by NCN.");
	});

	it("drops a heading that sits on its own line and joins the rest", () => {
		expect(
			extractAcknowledgment([
				ack("Acknowledgements"),
				ack("Funded by NCN."),
				ack("Thanks to the reviewers."),
			]),
		).toBe("Funded by NCN.\nThanks to the reviewers.");
	});

	it("drops an over-long capture rather than prefilling an invalid field", () => {
		expect(
			extractAcknowledgment([ack("Acknowledgments"), ack("x".repeat(2001))]),
		).toBe("");
	});

	it("returns an empty string without an acknowledgment zone", () => {
		expect(extractAcknowledgment([])).toBe("");
	});
});
