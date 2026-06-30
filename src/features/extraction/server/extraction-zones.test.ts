import { describe, expect, it } from "vitest";
import type { DocParagraph, DocRun } from "./docx-parser";
import {
	classifyZones,
	getMaxFontSize,
	looksLikeAffiliation,
	looksLikeAuthorLine,
	looksLikePersonName,
} from "./extraction-zones";

const p = (text: string, runs?: DocRun[]): DocParagraph => ({
	text,
	runs: runs ?? [{ text }],
});

describe("classifyZones", () => {
	it("walks TITLE → AUTHORS → AFFILIATIONS → EMAILS → KEYWORDS → BODY", () => {
		const zones = classifyZones([
			p("A Study of Important Things"),
			p("Jan Kowalski, Anna Nowak"),
			p("University of Warsaw"),
			p("jan@uw.edu.pl"),
			p("Keywords: machine learning, ai"),
			p("Abstract"),
			p("This is the body of the paper."),
		]).map((c) => c.zone);

		expect(zones).toEqual([
			"TITLE",
			"AUTHORS",
			"AFFILIATIONS",
			"EMAILS",
			"KEYWORDS",
			"BODY",
			"BODY",
		]);
	});

	it("skips empty paragraphs", () => {
		const result = classifyZones([p("Title"), p("   "), p("Section text")]);
		expect(result).toHaveLength(2);
		expect(result[0].zone).toBe("TITLE");
	});

	it("treats an ambiguous post-title line as affiliation, not body", () => {
		const zones = classifyZones([
			p("The Title"),
			p("some lowercase ambiguous line"),
		]).map((c) => c.zone);
		expect(zones).toEqual(["TITLE", "AFFILIATIONS"]);
	});

	it("re-enters KEYWORDS from BODY when a keywords line appears", () => {
		const zones = classifyZones([
			p("Title"),
			p("Introduction"),
			p("Keywords: a, b"),
		]).map((c) => c.zone);
		expect(zones).toEqual(["TITLE", "BODY", "KEYWORDS"]);
	});
});

describe("looksLikePersonName", () => {
	it("accepts 2–4 capitalized words", () => {
		expect(looksLikePersonName("Jan Kowalski")).toBe(true);
		expect(looksLikePersonName("Anna-Maria Nowak")).toBe(true);
	});

	it("rejects single words and lowercase", () => {
		expect(looksLikePersonName("Jan")).toBe(false);
		expect(looksLikePersonName("jan kowalski")).toBe(false);
	});
});

describe("looksLikeAuthorLine", () => {
	it("detects comma-separated capitalized names", () => {
		expect(looksLikeAuthorLine(p("Jan Kowalski, Anna Nowak"))).toBe(true);
	});

	it("detects superscript markers", () => {
		expect(
			looksLikeAuthorLine(
				p("Jan Kowalski1", [{ text: "1", superscript: true }]),
			),
		).toBe(true);
	});
});

describe("looksLikeAffiliation", () => {
	it("detects institution keywords on a short line", () => {
		expect(
			looksLikeAffiliation("University of Warsaw", p("University of Warsaw")),
		).toBe(true);
	});

	it("detects a postal-code address line", () => {
		expect(
			looksLikeAffiliation("00-001 Warsaw, Poland", p("00-001 Warsaw, Poland")),
		).toBe(true);
	});

	it("is false for a plain body sentence", () => {
		const text = "This paragraph is a normal sentence with no markers.";
		expect(looksLikeAffiliation(text, p(text))).toBe(false);
	});
});

describe("getMaxFontSize", () => {
	it("returns the largest non-super/subscript run size", () => {
		expect(
			getMaxFontSize([
				p("a", [{ text: "a", sizeHp: 24 }]),
				p("b", [{ text: "b", sizeHp: 36 }]),
			]),
		).toBe(36);
	});
});
