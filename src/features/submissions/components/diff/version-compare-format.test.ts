import { describe, expect, it } from "vitest";
import {
	authorsToText,
	type CompareAuthor,
	keywordsToText,
} from "./version-compare-format";

const ann: CompareAuthor = {
	firstName: "Ann",
	lastName: "Vo",
	email: "ann@x.io",
	affiliation: "MIT",
	isPresenter: true,
};

describe("authorsToText", () => {
	it("returns empty string for undefined or empty", () => {
		expect(authorsToText(undefined)).toBe("");
		expect(authorsToText([])).toBe("");
	});

	it("formats a presenter with affiliation and a star marker", () => {
		expect(authorsToText([ann])).toBe("Ann Vo <ann@x.io> (MIT) ★ presenter");
	});

	it("omits the affiliation parentheses when affiliation is blank", () => {
		expect(authorsToText([{ ...ann, affiliation: "" }])).toBe(
			"Ann Vo <ann@x.io> ★ presenter",
		);
	});

	it("omits the star for a non-presenter", () => {
		expect(authorsToText([{ ...ann, isPresenter: false }])).toBe(
			"Ann Vo <ann@x.io> (MIT)",
		);
	});

	it("renders one author per line, preserving order", () => {
		const bo: CompareAuthor = {
			firstName: "Bo",
			lastName: "Li",
			email: "bo@x.io",
			affiliation: "ETH",
			isPresenter: false,
		};
		expect(authorsToText([ann, bo])).toBe(
			"Ann Vo <ann@x.io> (MIT) ★ presenter\nBo Li <bo@x.io> (ETH)",
		);
	});
});

describe("keywordsToText", () => {
	it("returns empty string for undefined or empty", () => {
		expect(keywordsToText(undefined)).toBe("");
		expect(keywordsToText([])).toBe("");
	});

	it("joins keywords one per line", () => {
		expect(keywordsToText(["alpha", "beta", "gamma"])).toBe(
			"alpha\nbeta\ngamma",
		);
	});
});
