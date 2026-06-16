import { describe, expect, it } from "vitest";
import {
	applyPlaceholders,
	joinTitles,
	pickRandom,
	recipientValues,
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
