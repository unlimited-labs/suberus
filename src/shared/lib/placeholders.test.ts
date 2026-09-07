import { describe, expect, it } from "vitest";
import {
	applyPlaceholders,
	extractTokens,
	joinTitles,
	parseRecipientData,
	pickRandom,
	recipientValues,
	suggestPlaceholderKey,
	unknownTokens,
} from "./placeholders";

describe("joinTitles", () => {
	it("comma-joins non-empty titles", () => {
		expect(joinTitles(["A", "B"])).toBe("A, B");
	});

	it("returns empty string when there are none", () => {
		expect(joinTitles([])).toBe("");
	});

	it("drops null/undefined/blank entries and trims", () => {
		expect(joinTitles([null, "  X  ", undefined, "", "Y"])).toBe("X, Y");
	});
});

describe("recipientValues", () => {
	it("maps a snapshot, treating missing names as empty", () => {
		expect(
			recipientValues({ firstName: "Ann", lastName: null, titles: "T1, T2" }),
		).toEqual({ firstName: "Ann", lastName: "", title: "T1, T2" });
	});

	it("merges custom data and keeps built-ins authoritative", () => {
		expect(
			recipientValues({
				firstName: "Ann",
				lastName: "Lee",
				titles: "T1",
				data: { hotel: "Willa", firstName: "IGNORED" },
			}),
		).toEqual({
			firstName: "Ann",
			lastName: "Lee",
			title: "T1",
			hotel: "Willa",
		});
	});
});

describe("extractTokens", () => {
	it("returns each token once, ignoring malformed ones", () => {
		expect(extractTokens("{{a}} {{a}} {{b}} {{1c}} {{ d }}")).toEqual([
			"a",
			"b",
		]);
	});
});

describe("unknownTokens", () => {
	it("keeps only tokens outside the known set", () => {
		expect(unknownTokens(["hotel", "hotle"], ["hotel", "firstName"])).toEqual([
			"hotle",
		]);
	});
});

describe("suggestPlaceholderKey", () => {
	it("camel-cases a header and strips diacritics", () => {
		expect(suggestPlaceholderKey("Nazwa przypisanego hotelu")).toBe(
			"nazwaPrzypisanegoHotelu",
		);
		expect(suggestPlaceholderKey("Dni pobytu (od - do)")).toBe("dniPobytuOdDo");
	});

	it("prefixes headers that would not start with a letter", () => {
		expect(suggestPlaceholderKey("2026 hotel")).toBe("column2026Hotel");
		expect(suggestPlaceholderKey("---")).toBe("column");
	});
});

describe("parseRecipientData", () => {
	it("accepts a string map and treats null as empty", () => {
		expect(parseRecipientData({ hotel: "Willa" })).toEqual({ hotel: "Willa" });
		expect(parseRecipientData(null)).toEqual({});
	});

	it("rejects non-string values and malformed keys", () => {
		expect(() => parseRecipientData({ hotel: 1 })).toThrow();
		expect(() => parseRecipientData({ "1bad": "x" })).toThrow();
	});
});

describe("applyPlaceholders", () => {
	const values = { firstName: "Ann", lastName: "Lee", title: "My Paper" };

	it("substitutes all known tokens", () => {
		expect(
			applyPlaceholders(
				"Hi {{firstName}} {{lastName}} — {{title}}",
				values,
				false,
			),
		).toBe("Hi Ann Lee — My Paper");
	});

	it("leaves unknown tokens untouched", () => {
		expect(applyPlaceholders("{{unknown}}", values, false)).toBe("{{unknown}}");
	});

	it("escapes values when rendering into HTML", () => {
		expect(
			applyPlaceholders(
				"<p>{{title}}</p>",
				{ ...values, title: "<b>&'\"</b>" },
				true,
			),
		).toBe("<p>&lt;b&gt;&amp;&#39;&quot;&lt;/b&gt;</p>");
	});

	it("does NOT escape for plain-text bodies", () => {
		expect(
			applyPlaceholders("{{title}}", { ...values, title: "a < b" }, false),
		).toBe("a < b");
	});

	it("does not interpret $-patterns in the value", () => {
		expect(
			applyPlaceholders("{{title}}", { ...values, title: "$1 & $&" }, false),
		).toBe("$1 & $&");
	});

	it("replaces every occurrence of a token", () => {
		expect(
			applyPlaceholders("{{firstName}}-{{firstName}}", values, false),
		).toBe("Ann-Ann");
	});

	it("substitutes custom keys and ignores inherited properties", () => {
		expect(
			applyPlaceholders("{{hotel}} {{toString}}", { hotel: "Willa" }, false),
		).toBe("Willa {{toString}}");
	});
});

describe("pickRandom", () => {
	it("returns undefined for an empty list", () => {
		expect(pickRandom([])).toBeUndefined();
	});

	it("uses the injected rng deterministically", () => {
		const items = ["a", "b", "c"];
		expect(pickRandom(items, () => 0)).toBe("a");
		expect(pickRandom(items, () => 0.99)).toBe("c");
	});
});
