import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { UploadValidationError, validateUpload } from "./validate-upload";

const FIXTURES = join(process.cwd(), "e2e", "submissions", "fixtures");
const pdf = () => readFileSync(join(FIXTURES, "document.pdf"));
const docx = () => readFileSync(join(FIXTURES, "document.docx"));

describe("validateUpload", () => {
	it("detects a PDF by magic number and returns the real mime", async () => {
		const result = await validateUpload(pdf(), {
			allowedExtensions: ["pdf", "docx"],
			maxBytes: 10 * 1024 * 1024,
		});
		expect(result).toEqual({ ext: "pdf", mime: "application/pdf" });
	});

	it("detects a DOCX despite the ZIP container", async () => {
		const result = await validateUpload(docx(), {
			allowedExtensions: ["pdf", "docx"],
			maxBytes: 10 * 1024 * 1024,
		});
		expect(result.ext).toBe("docx");
		expect(result.mime).toContain("wordprocessingml");
	});

	it("rejects a file whose detected type is not allowed", async () => {
		await expect(
			validateUpload(pdf(), {
				allowedExtensions: ["docx"],
				maxBytes: 10 * 1024 * 1024,
			}),
		).rejects.toBeInstanceOf(UploadValidationError);
	});

	it("rejects content with no recognizable signature (e.g. a renamed .txt)", async () => {
		const fakePdf = Buffer.from("This is plain text pretending to be a PDF");
		await expect(
			validateUpload(fakePdf, {
				allowedExtensions: ["pdf", "docx"],
				maxBytes: 10 * 1024 * 1024,
			}),
		).rejects.toBeInstanceOf(UploadValidationError);
	});

	it("rejects an empty file", async () => {
		await expect(
			validateUpload(Buffer.alloc(0), {
				allowedExtensions: ["pdf"],
				maxBytes: 10 * 1024 * 1024,
			}),
		).rejects.toThrow(/empty/i);
	});

	it("rejects a file over the size limit", async () => {
		await expect(
			validateUpload(pdf(), { allowedExtensions: ["pdf"], maxBytes: 16 }),
		).rejects.toThrow(/limit/i);
	});
});
