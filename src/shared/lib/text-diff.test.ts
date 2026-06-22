import { describe, expect, it } from "vitest";
import { type DiffSegment, diffText, fileChanged } from "./text-diff";

const join = (segments: DiffSegment[], type: DiffSegment["type"]) =>
	segments
		.filter((s) => s.type === type)
		.map((s) => s.value)
		.join("");

/** Reconstructing old text = equal + delete; new text = equal + insert. */
const reconstructOld = (segments: DiffSegment[]) =>
	segments
		.filter((s) => s.type !== "insert")
		.map((s) => s.value)
		.join("");
const reconstructNew = (segments: DiffSegment[]) =>
	segments
		.filter((s) => s.type !== "delete")
		.map((s) => s.value)
		.join("");

describe("diffText", () => {
	it("returns a single equal segment for identical text", () => {
		const segs = diffText("hello world", "hello world");
		expect(segs).toEqual([{ type: "equal", value: "hello world" }]);
	});

	it("marks a replaced word with both a deletion and an insertion", () => {
		const oldText = "The model presents an approach.";
		const newText = "The model proposes an approach.";
		const segs = diffText(oldText, newText);
		expect(join(segs, "delete").length).toBeGreaterThan(0);
		expect(join(segs, "insert").length).toBeGreaterThan(0);
		// Unchanged surrounding context is preserved verbatim.
		expect(join(segs, "equal")).toContain("The model ");
		expect(join(segs, "equal")).toContain(" an approach.");
		expect(reconstructOld(segs)).toBe(oldText);
		expect(reconstructNew(segs)).toBe(newText);
	});

	it("losslessly reconstructs both sides", () => {
		const oldText = "Cooling rates from 0.5 to 45 C/s were sampled.";
		const newText = "Cooling rates from 0.5 to 30 C/s were sampled twice.";
		const segs = diffText(oldText, newText);
		expect(reconstructOld(segs)).toBe(oldText);
		expect(reconstructNew(segs)).toBe(newText);
	});

	it("treats added text as pure insertion", () => {
		const segs = diffText("abstract.", "abstract. New sentence.");
		expect(join(segs, "delete")).toBe("");
		expect(join(segs, "insert")).toContain("New sentence.");
	});

	it("handles empty inputs without throwing", () => {
		expect(diffText("", "")).toEqual([]);
		expect(join(diffText("", "added"), "insert")).toBe("added");
		expect(join(diffText("removed", ""), "delete")).toBe("removed");
	});
});

describe("fileChanged", () => {
	it("is false for the same id and for two nulls", () => {
		expect(fileChanged("a", "a")).toBe(false);
		expect(fileChanged(null, null)).toBe(false);
		expect(fileChanged(undefined, null)).toBe(false);
	});

	it("is true when a file is added, removed, or swapped", () => {
		expect(fileChanged(null, "a")).toBe(true);
		expect(fileChanged("a", null)).toBe(true);
		expect(fileChanged("a", "b")).toBe(true);
	});
});
