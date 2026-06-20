import { describe, expect, it } from "vitest";
import {
	authorLine,
	authorsEqual,
	type CompareAuthor,
} from "./version-compare-format";

const ann: CompareAuthor = {
	firstName: "Ann",
	lastName: "Vo",
	email: "ann@x.io",
	affiliation: "MIT",
	isPresenter: true,
};

describe("authorLine", () => {
	it("formats a presenter with affiliation and a star marker", () => {
		expect(authorLine(ann)).toBe("Ann Vo — MIT ★");
	});

	it("omits the affiliation dash when affiliation is blank", () => {
		expect(authorLine({ ...ann, affiliation: "", isPresenter: false })).toBe(
			"Ann Vo",
		);
	});

	it("omits the star for a non-presenter", () => {
		expect(authorLine({ ...ann, isPresenter: false })).toBe("Ann Vo — MIT");
	});
});

describe("authorsEqual", () => {
	it("is true for identical snapshots", () => {
		expect(authorsEqual(ann, { ...ann })).toBe(true);
	});

	it("is false when an affiliation changes", () => {
		expect(authorsEqual(ann, { ...ann, affiliation: "ETH" })).toBe(false);
	});

	it("is false when the presenter flag changes", () => {
		expect(authorsEqual(ann, { ...ann, isPresenter: false })).toBe(false);
	});
});
