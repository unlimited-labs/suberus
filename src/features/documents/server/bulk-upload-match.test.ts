import { describe, expect, it } from "vitest";
import {
	documentUserIdFromEntry,
	isIgnoredZipEntry,
} from "@/features/documents/server/bulk-upload-match";

const ID = "11111111-2222-3333-4444-555555555555";

describe("documentUserIdFromEntry", () => {
	it("reads the id from a flat entry", () => {
		expect(documentUserIdFromEntry(`${ID}.pdf`)).toBe(ID);
	});

	it("reads the id from a nested entry", () => {
		expect(documentUserIdFromEntry(`invoices/2026/${ID}.PDF`)).toBe(ID);
	});

	it("lowercases so a Windows-cased export still matches", () => {
		expect(documentUserIdFromEntry(`${ID.toUpperCase()}.pdf`)).toBe(ID);
	});

	it("rejects a name that is not a uuid", () => {
		expect(documentUserIdFromEntry("invoice-14.pdf")).toBeNull();
		expect(documentUserIdFromEntry(`${ID}-extra.pdf`)).toBeNull();
	});

	it("rejects a non-pdf", () => {
		expect(documentUserIdFromEntry(`${ID}.docx`)).toBeNull();
	});
});

describe("isIgnoredZipEntry", () => {
	it("skips archiver noise", () => {
		expect(isIgnoredZipEntry("__MACOSX")).toBe(true);
		expect(isIgnoredZipEntry(".DS_Store")).toBe(true);
		expect(isIgnoredZipEntry(`${ID}.pdf`)).toBe(false);
	});
});
