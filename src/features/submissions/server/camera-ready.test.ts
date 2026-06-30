import { describe, expect, it } from "vitest";
import {
	cameraReadyNumberFromFilename,
	isIgnoredBulkEntry,
} from "./camera-ready-match";

describe("cameraReadyNumberFromFilename", () => {
	it("reads the leading sequential number", () => {
		expect(cameraReadyNumberFromFilename("7.pdf")).toBe(7);
	});

	it("tolerates suffixes after the number", () => {
		expect(cameraReadyNumberFromFilename("12-branded-final.pdf")).toBe(12);
		expect(cameraReadyNumberFromFilename("003 (sponsors).pdf")).toBe(3);
	});

	it("returns null when there is no leading number", () => {
		expect(cameraReadyNumberFromFilename("keynote.pdf")).toBeNull();
		expect(cameraReadyNumberFromFilename("paper-7.pdf")).toBeNull();
	});
});

describe("isIgnoredBulkEntry", () => {
	it("ignores the export manifest and dotfiles", () => {
		expect(isIgnoredBulkEntry("submissions.csv")).toBe(true);
		expect(isIgnoredBulkEntry("SUBMISSIONS.CSV")).toBe(true);
		expect(isIgnoredBulkEntry(".DS_Store")).toBe(true);
	});

	it("keeps real PDF entries", () => {
		expect(isIgnoredBulkEntry("1.pdf")).toBe(false);
	});
});
