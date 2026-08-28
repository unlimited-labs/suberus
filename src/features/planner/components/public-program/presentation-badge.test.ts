import { describe, expect, it } from "vitest";
import { readableTextOn } from "./presentation-badge";

describe("readableTextOn", () => {
	it("puts white text on dark badges and black on light ones", () => {
		expect(readableTextOn("#000000")).toBe("#ffffff");
		expect(readableTextOn("#dc2626")).toBe("#ffffff");
		expect(readableTextOn("#ffffff")).toBe("#000000");
		expect(readableTextOn("#fef08a")).toBe("#000000");
	});
});
