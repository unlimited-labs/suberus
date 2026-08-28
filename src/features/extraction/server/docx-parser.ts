import AdmZip from "adm-zip";
import { lookup } from "@/shared/lib/lookup";

export interface DocRun {
	text: string;
	bold?: boolean;
	italic?: boolean;
	/** Font size in half-points (e.g., 24 = 12pt) */
	sizeHp?: number;
	superscript?: boolean;
	subscript?: boolean;
}

export interface DocParagraph {
	runs: DocRun[];
	text: string;
}

export function parseDocx(buffer: Buffer): DocParagraph[] {
	const zip = new AdmZip(buffer);
	const docEntry = zip.getEntry("word/document.xml");
	if (!docEntry) return [];

	const xml = docEntry.getData().toString("utf8");

	const bodyMatch = xml.match(/<w:body>([\s\S]*)<\/w:body>/);
	if (!bodyMatch) return [];
	const bodyXml = bodyMatch[1];

	const paragraphs: DocParagraph[] = [];

	const paraRegex = /<w:p[\s>][\s\S]*?<\/w:p>/g;
	let paraMatch: RegExpExecArray | null;

	for (paraMatch of bodyXml.matchAll(paraRegex)) {
		const paraXml = paraMatch[0];
		const para = parseParagraph(paraXml);
		if (para.text.trim().length > 0) {
			paragraphs.push(para);
		}
	}

	return paragraphs;
}

function parseParagraph(paraXml: string): DocParagraph {
	const runs: DocRun[] = [];

	// Match <w:r> and <w:hyperlink> in document order using a combined regex
	// This preserves interleaving: <w:r>,</w:r> <w:hyperlink>email</w:hyperlink> <w:r>,</w:r>
	const childRegex =
		/<w:r[\s>][\s\S]*?<\/w:r>|<w:hyperlink[\s\S]*?<\/w:hyperlink>/g;

	for (const match of paraXml.matchAll(childRegex)) {
		const chunk = match[0];

		if (chunk.startsWith("<w:hyperlink")) {
			for (const hlRun of chunk.matchAll(/<w:r[\s>][\s\S]*?<\/w:r>/g)) {
				const run = parseRun(hlRun[0]);
				if (run) runs.push(run);
			}
		} else {
			const run = parseRun(chunk);
			if (run) runs.push(run);
		}
	}

	const fullText = runs.map((r) => r.text).join("");
	return { runs, text: fullText };
}

const CONTENT_RE =
	/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:(noBreakHyphen|tab|br)\s*\/>/g;

const CONTENT_CHAR = { noBreakHyphen: "-", tab: "\t", br: "\n" };

const NAMED_ENTITY = { lt: "<", gt: ">", quot: '"', apos: "'", amp: "&" };

const ENTITY_RE = /&(?:#x([0-9a-f]+)|#(\d+)|(lt|gt|quot|apos|amp));/gi;

/** Single pass, so a decoded `&#38;` cannot combine with what follows it. */
function decodeEntities(text: string): string {
	return text.replace(ENTITY_RE, (whole, hex, dec, name) => {
		if (hex) return String.fromCodePoint(Number.parseInt(hex, 16));
		if (dec) return String.fromCodePoint(Number.parseInt(dec, 10));
		return lookup(NAMED_ENTITY, name.toLowerCase()) ?? whole;
	});
}

function parseRun(runXml: string): DocRun | null {
	let text = "";
	for (const match of runXml.matchAll(CONTENT_RE)) {
		const [, content, element] = match;
		text +=
			content === undefined
				? (lookup(CONTENT_CHAR, element) ?? "")
				: decodeEntities(content);
	}
	if (text.length === 0) return null;

	const rPrMatch = runXml.match(/<w:rPr>([\s\S]*?)<\/w:rPr>/);
	const rPr = rPrMatch?.[1] ?? "";

	const bold = /<w:b[\s/>]/.test(rPr) && !/<w:b\s+w:val="0"/.test(rPr);
	const italic = /<w:i[\s/>]/.test(rPr) && !/<w:i\s+w:val="0"/.test(rPr);

	// Font size: <w:sz w:val="24"/> = 24 half-points = 12pt
	let sizeHp: number | undefined;
	const szMatch = rPr.match(/<w:sz\s+w:val="(\d+)"/);
	if (szMatch) sizeHp = Number.parseInt(szMatch[1], 10);

	const vertMatch = rPr.match(/<w:vertAlign\s+w:val="(\w+)"/);
	const superscript = vertMatch?.[1] === "superscript";
	const subscript = vertMatch?.[1] === "subscript";

	return { text, bold, italic, sizeHp, superscript, subscript };
}
