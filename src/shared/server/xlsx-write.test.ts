import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { writeXlsxBuffer } from "./xlsx-write";

describe("writeXlsxBuffer", () => {
	it("writes a formula-looking value as text, not a formula", () => {
		const buffer = writeXlsxBuffer([{ Title: "=cmd()" }], "S");
		const sheet = XLSX.read(buffer, { type: "buffer" }).Sheets.S;
		const cell = sheet?.A2;

		expect(cell?.t).toBe("s");
		expect(cell?.f).toBeUndefined();
		expect(cell?.v).toBe("=cmd()");
	});

	it("keeps a leading dash out of the exported value", () => {
		const buffer = writeXlsxBuffer([{ Title: "-omics profiling" }], "S");
		const sheet = XLSX.read(buffer, { type: "buffer" }).Sheets.S;

		expect(sheet?.A2?.v).toBe("-omics profiling");
	});
});
