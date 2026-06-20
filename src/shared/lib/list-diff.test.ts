import { describe, expect, it } from "vitest";
import { diffList, listChanged } from "./list-diff";

const id = (s: string) => s;

describe("diffList (strings)", () => {
	it("flags added and removed keywords", () => {
		const out = diffList(["a", "b"], ["a", "c"], id);
		expect(out).toEqual([
			{ status: "unchanged", item: "a" },
			{ status: "added", item: "c" },
			{ status: "removed", item: "b" },
		]);
	});

	it("flags a moved item (same value, new position)", () => {
		const out = diffList(["a", "b", "c"], ["c", "a", "b"], id);
		expect(out[0]).toEqual({ status: "moved", item: "c" });
		expect(out.filter((e) => e.status === "removed")).toHaveLength(0);
	});

	it("reports no change for identical lists", () => {
		expect(listChanged(diffList(["a", "b"], ["a", "b"], id))).toBe(false);
	});
});

interface Author {
	email: string;
	name: string;
	affiliation: string;
}

describe("diffList (authors keyed by email)", () => {
	const key = (a: Author) => a.email;
	const equal = (a: Author, b: Author) =>
		a.name === b.name && a.affiliation === b.affiliation;

	it("detects a changed author (same email, new affiliation)", () => {
		const oldA: Author[] = [{ email: "x@a", name: "X", affiliation: "Old U" }];
		const newA: Author[] = [{ email: "x@a", name: "X", affiliation: "New U" }];
		const out = diffList(oldA, newA, key, equal);
		expect(out[0].status).toBe("changed");
		expect(out[0].previous?.affiliation).toBe("Old U");
	});

	it("separates add / remove by email identity", () => {
		const oldA: Author[] = [{ email: "x@a", name: "X", affiliation: "U" }];
		const newA: Author[] = [{ email: "y@b", name: "Y", affiliation: "U" }];
		const out = diffList(oldA, newA, key, equal);
		expect(out.map((e) => e.status).sort()).toEqual(["added", "removed"]);
	});
});
