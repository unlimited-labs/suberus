import AdmZip from "adm-zip";
import { describe, expect, it } from "vitest";
import { parseDocx } from "./docx-parser";

const docx = (...paragraphs: string[]): Buffer => {
	const zip = new AdmZip();
	zip.addFile(
		"word/document.xml",
		Buffer.from(
			`<?xml version="1.0"?><w:document><w:body>${paragraphs
				.map((p) => `<w:p>${p}</w:p>`)
				.join("")}</w:body></w:document>`,
			"utf8",
		),
	);
	return zip.toBuffer();
};

const run = (inner: string) => `<w:r>${inner}</w:r>`;

describe("parseDocx", () => {
	it("keeps a non-breaking hyphen as a plain hyphen", () => {
		const buf = docx(
			run(`<w:t>plasma</w:t><w:noBreakHyphen/><w:t>induced sub</w:t>`) +
				run(`<w:noBreakHyphen/><w:t>surface</w:t>`),
		);
		expect(parseDocx(buf)[0].text).toBe("plasma-induced sub-surface");
	});

	it("keeps tabs and line breaks", () => {
		const buf = docx(
			run(`<w:t>a</w:t><w:tab/><w:t>b</w:t><w:br/><w:t>c</w:t>`),
		);
		expect(parseDocx(buf)[0].text).toBe("a\tb\nc");
	});

	it("drops a soft hyphen, which is invisible unless the line wraps", () => {
		const buf = docx(run(`<w:t>micro</w:t><w:softHyphen/><w:t>scopy</w:t>`));
		expect(parseDocx(buf)[0].text).toBe("microscopy");
	});

	it("decodes XML entities", () => {
		const buf = docx(
			run(
				`<w:t>&#8216;Makoto&#x2019; &lt;m@x.pl&gt; &amp; &quot;co&apos;s&quot;</w:t>`,
			),
		);
		expect(parseDocx(buf)[0].text).toBe(`‘Makoto’ <m@x.pl> & "co's"`);
	});

	it("does not double-decode an escaped entity", () => {
		const buf = docx(run(`<w:t>a &amp;lt; b and &#38;gt; c</w:t>`));
		expect(parseDocx(buf)[0].text).toBe("a &lt; b and &gt; c");
	});

	it("reads run formatting", () => {
		const buf = docx(
			run(
				`<w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t xml:space="preserve">Title </w:t>`,
			),
		);
		const [para] = parseDocx(buf);
		expect(para.runs[0]).toMatchObject({ bold: true, sizeHp: 24 });
		expect(para.text).toBe("Title ");
	});

	it("returns nothing for a zip without a document part", () => {
		const zip = new AdmZip();
		zip.addFile("word/other.xml", Buffer.from("<x/>", "utf8"));
		expect(parseDocx(zip.toBuffer())).toEqual([]);
	});
});
