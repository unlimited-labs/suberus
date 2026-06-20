import { describe, expect, it } from "vitest";
import { redlineStats } from "./diff";

// The redline itself (structural tree diff, math, moves) is produced by the
// docx-api sidecar and covered by services/docx-api/test_diffhtml.py.
describe("redlineStats", () => {
	it("counts ins/del runs", () => {
		const redline = "<p><del>a</del><ins>b</ins> and <ins>c</ins></p>";
		expect(redlineStats(redline)).toEqual({ insertions: 2, deletions: 1 });
	});
});
