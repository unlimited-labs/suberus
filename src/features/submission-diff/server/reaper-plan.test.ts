import { describe, expect, it } from "vitest";
import {
	computeLiveKeys,
	selectDanglingDiffIds,
	selectSupersededIds,
} from "./reaper-plan";

const D = (iso: string) => new Date(iso);

describe("selectSupersededIds", () => {
	const cutoff = D("2026-06-10T00:00:00Z");

	it("keeps the newest per (sourceSha256, kind) and supersedes older ones past cutoff", () => {
		const rows = [
			{
				id: "new",
				sourceSha256: "a",
				kind: "DOCX",
				createdAt: D("2026-06-12"),
			},
			{
				id: "old",
				sourceSha256: "a",
				kind: "DOCX",
				createdAt: D("2026-06-01"),
			},
		];
		expect(selectSupersededIds(rows, cutoff)).toEqual(["old"]);
	});

	it("does not supersede an older row still inside the grace window", () => {
		const rows = [
			{
				id: "new",
				sourceSha256: "a",
				kind: "DOCX",
				createdAt: D("2026-06-12"),
			},
			{
				id: "old",
				sourceSha256: "a",
				kind: "DOCX",
				createdAt: D("2026-06-11"),
			},
		];
		expect(selectSupersededIds(rows, cutoff)).toEqual([]);
	});

	it("treats different (sourceSha, kind) as independent newest groups", () => {
		const rows = [
			{ id: "a1", sourceSha256: "a", kind: "DOCX", createdAt: D("2026-06-12") },
			{ id: "b1", sourceSha256: "a", kind: "PDF", createdAt: D("2026-06-12") },
		];
		expect(selectSupersededIds(rows, cutoff)).toEqual([]);
	});
});

describe("selectDanglingDiffIds", () => {
	it("flags diffs whose old or new version is gone", () => {
		const diffs = [
			{ id: "keep", oldVersionId: "v1", newVersionId: "v2" },
			{ id: "drop", oldVersionId: "v1", newVersionId: "gone" },
		];
		const existing = new Set(["v1", "v2"]);
		expect(selectDanglingDiffIds(diffs, existing)).toEqual(["drop"]);
	});
});

describe("computeLiveKeys", () => {
	it("unions html keys, figure keys, and redline keys", () => {
		const live = computeLiveKeys(
			[{ htmlKey: "html/a", figureShas: ["f1", "f2"] }],
			[{ redlineKey: "redline/r" }],
			(sha) => `fig/${sha}`,
		);
		expect([...live].sort()).toEqual(
			["fig/f1", "fig/f2", "html/a", "redline/r"].sort(),
		);
	});
});
