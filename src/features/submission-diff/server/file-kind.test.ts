import { describe, expect, it } from "vitest";
import { fileKind } from "./file-kind";

describe("fileKind", () => {
	it("maps docx and pdf (case-insensitive) to their kinds", () => {
		expect(fileKind("paper.docx")).toBe("DOCX");
		expect(fileKind("PAPER.DOCX")).toBe("DOCX");
		expect(fileKind("revision.pdf")).toBe("PDF");
		expect(fileKind("REVISION.PDF")).toBe("PDF");
	});

	it("uses the last extension and ignores dotted names", () => {
		expect(fileKind("my.report.final.docx")).toBe("DOCX");
		expect(fileKind("a.b.c.pdf")).toBe("PDF");
	});

	it("returns null for non-diffable or extensionless names", () => {
		expect(fileKind("notes.txt")).toBeNull();
		expect(fileKind("image.png")).toBeNull();
		expect(fileKind("README")).toBeNull();
		expect(fileKind("")).toBeNull();
	});
});
