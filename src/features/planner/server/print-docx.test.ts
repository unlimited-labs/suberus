import AdmZip from "adm-zip";
import { describe, expect, it } from "vitest";
import type { PrintDocument } from "@/features/planner/print/print-document-schema";
import { renderDocx } from "./print-docx";

const doc: PrintDocument = {
	schemaVersion: 1,
	draft: true,
	language: "en",
	footer: "Polymers 2026",
	swatches: [{ name: "Polymers", color: "#ff0000" }],
	sections: [
		{
			page: { size: "A4", orientation: "portrait" },
			columns: 1,
			start: "nextPage",
			blocks: [
				{
					type: "paragraph",
					style: "Title",
					runs: [{ text: "Polymers 2026" }],
				},
				{ type: "toc", title: "Contents" },
				{
					type: "paragraph",
					style: "PartHeading",
					runs: [{ text: "Detailed program" }],
				},
				{
					type: "paragraph",
					style: "SessionHeading",
					runs: [{ text: "1A1 ", charStyle: "Code" }, { text: "Opening" }],
				},
			],
		},
		{
			page: { size: "A4", orientation: "landscape" },
			columns: 1,
			start: "evenPage",
			blocks: [
				{
					type: "table",
					columns: [
						{ widthWeight: 0.6 },
						{ widthWeight: 1 },
						{ widthWeight: 1 },
					],
					headerRows: 1,
					rowCount: 3,
					cells: [
						{
							row: 0,
							col: 0,
							rowSpan: 1,
							colSpan: 1,
							accent: null,
							blocks: [
								{
									type: "paragraph",
									style: "GridHeader",
									runs: [{ text: "Time" }],
								},
							],
						},
						{
							row: 0,
							col: 1,
							rowSpan: 1,
							colSpan: 2,
							accent: null,
							blocks: [
								{
									type: "paragraph",
									style: "GridHeader",
									runs: [{ text: "Aula" }],
								},
							],
						},
						{
							row: 1,
							col: 1,
							rowSpan: 2,
							colSpan: 1,
							accent: "#ff0000",
							blocks: [
								{
									type: "paragraph",
									style: "GridCell",
									runs: [{ text: "1A1 Opening" }],
								},
							],
						},
					],
				},
			],
		},
	],
};

function parts(buffer: Buffer) {
	const zip = new AdmZip(buffer);
	const read = (name: string) =>
		zip.getEntry(name)?.getData().toString("utf8") ?? "";
	const headers = zip
		.getEntries()
		.filter((e) => /word\/header\d+\.xml/.test(e.entryName))
		.map((e) => e.getData().toString("utf8"))
		.join("");
	return {
		document: read("word/document.xml"),
		styles: read("word/styles.xml"),
		headers,
	};
}

describe("renderDocx", () => {
	it("writes the catalog styles by name and applies them to paragraphs and runs", async () => {
		const { document, styles } = parts(await renderDocx(doc));
		expect(styles).toContain('w:styleId="SessionHeading"');
		expect(styles).toContain('w:styleId="Code"');
		expect(document).toContain('<w:pStyle w:val="SessionHeading"/>');
		expect(document).toContain('<w:rStyle w:val="Code"/>');
		expect(document).toMatch(/<w:rStyle w:val="Code"\/><w:b\/>/);
	});

	it("builds the grid with merged cells, a repeated header row, the track accent and hatched empty cells", async () => {
		const { document } = parts(await renderDocx(doc));
		expect(document).toContain("<w:tblHeader/>");
		expect(document).toContain('<w:gridSpan w:val="2"/>');
		expect(document).toContain('<w:vMerge w:val="restart"/>');
		expect(document).toMatch(/<w:left [^>]*w:color="FF0000"/);
		expect(document).toContain('w:val="diagStripe"');
	});

	it("starts the spread section on an even landscape page and builds the contents from Part and day headings", async () => {
		const { document } = parts(await renderDocx(doc));
		expect(document).toContain('<w:type w:val="evenPage"/>');
		expect(document).toContain('w:orient="landscape"');
		expect(document).toContain(
			"TOC \\h \\t &quot;PartHeading,1,DayHeading,2&quot;",
		);
	});

	it("drops characters XML cannot carry, pasted from Word into a title or the footer", async () => {
		const dirty: PrintDocument = {
			...doc,
			footer: "Poly\x0bmers",
			sections: doc.sections.map((s) => ({
				...s,
				blocks: [
					{
						type: "paragraph",
						style: "Title",
						runs: [{ text: "Open\x01ing" }],
					},
					...s.blocks,
				],
			})),
		};
		const zip = new AdmZip(await renderDocx(dirty));
		const xml = zip
			.getEntries()
			.map((e) => e.getData().toString("utf8"))
			.join("");
		expect(xml).not.toContain("\x0b");
		expect(xml).not.toContain("\x01");
		expect(xml).toContain("Opening");
	});

	it("marks a draft with a watermark in every section header", async () => {
		const { headers } = parts(await renderDocx(doc));
		expect(headers).toContain("DRAFT");
	});
});
