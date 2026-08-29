import { describe, expect, it } from "vitest";
import type { DocParagraph, DocRun } from "./docx-parser";
import { MAX_TITLE_LENGTH, MAX_TITLE_PARAGRAPHS } from "./extraction-patterns";
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
			p("The Title", [{ text: "The Title", bold: true }]),
			p("some lowercase ambiguous line"),
		]).map((c) => c.zone);
		expect(zones).toEqual(["TITLE", "AFFILIATIONS"]);
	});

	it("keeps a title that continues into the next paragraph", () => {
		const big = (text: string) => p(text, [{ text, bold: true, sizeHp: 24 }]);
		const zones = classifyZones([
			big("Effect of prolonged natural aging on clustering"),
			big("Al-Mg-Si alloy with excess Mg"),
			p("Jan Kowalski, Anna Nowak", [
				{ text: "Jan Kowalski, Anna Nowak", sizeHp: 18 },
			]),
		]).map((c) => c.zone);
		expect(zones).toEqual(["TITLE", "TITLE", "AUTHORS"]);
	});

	it("does not swallow an author list set in the title font", () => {
		const big = (text: string) => p(text, [{ text, bold: true, sizeHp: 24 }]);
		const zones = classifyZones([
			big("Shape memory effect driven by shallow energy wells"),
			big("Martyna Lederer, Kinga Nalepka, Robert Chulist"),
		]).map((c) => c.zone);
		expect(zones).toEqual(["TITLE", "AUTHORS"]);
	});

	it("stops the title at a font change", () => {
		const zones = classifyZones([
			p("core-shell nanostructures", [
				{ text: "core-shell nanostructures", sizeHp: 24 },
			]),
			p("more lowercase words here", [
				{ text: "more lowercase words here", sizeHp: 18 },
			]),
		]).map((c) => c.zone);
		expect(zones).toEqual(["TITLE", "AUTHORS"]);
	});

	it("will not continue an unformatted title into a capitalized line", () => {
		const zones = classifyZones([
			p("Thermal Stability of Nanocrystalline Alloys"),
			p("Jan Kowalski and Anna Nowak"),
		]).map((c) => c.zone);
		expect(zones).toEqual(["TITLE", "AFFILIATIONS"]);
	});

	it("continues an unformatted title into a lowercase fragment", () => {
		const zones = classifyZones([
			p("Structure and corrosion resistance of CoCrFeNiNb alloys"),
			p("produced by the rapid solidification"),
		]).map((c) => c.zone);
		expect(zones).toEqual(["TITLE", "TITLE"]);
	});

	it("never pulls an affiliation or a keywords line into the title", () => {
		const plain = (text: string) => p(text);
		const zones = classifyZones([
			plain("A Study of Important Things"),
			plain("University of Warsaw"),
			plain("Keywords: a, b"),
		]).map((c) => c.zone);
		expect(zones).toEqual(["TITLE", "AFFILIATIONS", "KEYWORDS"]);
	});

	it("caps the joined title at MAX_TITLE_LENGTH", () => {
		const long = "word ".repeat(80).trim();
		const zones = classifyZones([p("A Title"), p(long)]).map((c) => c.zone);
		expect(long.length).toBeGreaterThan(MAX_TITLE_LENGTH);
		expect(zones).toEqual(["TITLE", "AFFILIATIONS"]);
	});

	it("caps the title at MAX_TITLE_PARAGRAPHS", () => {
		const zones = classifyZones([
			p("first fragment of a title"),
			p("second fragment of a title"),
			p("third fragment of a title"),
			p("fourth fragment of a title"),
		]).map((c) => c.zone);
		expect(zones.filter((z) => z === "TITLE")).toHaveLength(
			MAX_TITLE_PARAGRAPHS,
		);
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

describe("acknowledgment zone", () => {
	it("re-enters from the body on the heading and ends at references", () => {
		const zones = classifyZones([
			p("A Study of Important Things"),
			p("Jan Kowalski"),
			p("University of Warsaw"),
			p("Abstract"),
			p("Body of the paper."),
			p("Acknowledgments"),
			p("Funded by grant NCN 2020/01/X."),
			p("References"),
			p("[1] Someone, Some paper, 2020."),
		]).map((c) => c.zone);

		expect(zones.slice(5)).toEqual([
			"ACKNOWLEDGMENT",
			"ACKNOWLEDGMENT",
			"BODY",
			"BODY",
		]);
	});

	it("ends at a bracketed bibliography entry with no References heading", () => {
		const zones = classifyZones([
			p("Title"),
			p("Abstract"),
			p("Acknowledgments"),
			p("Funded by grant NCN 2020/01/X."),
			p("[1] Someone, Some paper, 2020."),
			p("[2] Another, Other paper, 2021."),
		]).map((c) => c.zone);

		expect(zones.slice(2)).toEqual([
			"ACKNOWLEDGMENT",
			"ACKNOWLEDGMENT",
			"BODY",
			"BODY",
		]);
	});

	it("ignores a body sentence that merely starts with the word", () => {
		const zones = classifyZones([
			p("Title"),
			p("Abstract"),
			p("Acknowledgement of prior work is discussed in section 3."),
		]).map((c) => c.zone);

		expect(zones.slice(2)).toEqual(["BODY"]);
	});

	it("ends at a numbered section heading", () => {
		const zones = classifyZones([
			p("Title"),
			p("Abstract"),
			p("Acknowledgment: thanks to the team."),
			p("4. Conclusions"),
		]).map((c) => c.zone);

		expect(zones.slice(2)).toEqual(["ACKNOWLEDGMENT", "BODY"]);
	});
});
