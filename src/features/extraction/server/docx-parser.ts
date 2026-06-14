/**
 * Lightweight DOCX parser that extracts paragraphs with per-run formatting.
 * Parses document.xml directly using regex to preserve child element order.
 */
import AdmZip from "adm-zip";

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

	// Extract body content
	const bodyMatch = xml.match(/<w:body>([\s\S]*)<\/w:body>/);
	if (!bodyMatch) return [];
	const bodyXml = bodyMatch[1];

	const paragraphs: DocParagraph[] = [];

	// Match each <w:p>...</w:p> block
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
			// Extract runs inside hyperlink
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

function parseRun(runXml: string): DocRun | null {
	// Extract text from <w:t> elements
	let text = "";
	for (const tMatch of runXml.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)) {
		text += tMatch[1];
	}
	if (text.length === 0) return null;

	// Extract run properties from <w:rPr>
	const rPrMatch = runXml.match(/<w:rPr>([\s\S]*?)<\/w:rPr>/);
	const rPr = rPrMatch?.[1] ?? "";

	const bold = /<w:b[\s/>]/.test(rPr) && !/<w:b\s+w:val="0"/.test(rPr);
	const italic = /<w:i[\s/>]/.test(rPr) && !/<w:i\s+w:val="0"/.test(rPr);

	// Font size: <w:sz w:val="24"/> = 24 half-points = 12pt
	let sizeHp: number | undefined;
	const szMatch = rPr.match(/<w:sz\s+w:val="(\d+)"/);
	if (szMatch) sizeHp = Number.parseInt(szMatch[1], 10);

	// Superscript/subscript: <w:vertAlign w:val="superscript"/>
	const vertMatch = rPr.match(/<w:vertAlign\s+w:val="(\w+)"/);
	const superscript = vertMatch?.[1] === "superscript";
	const subscript = vertMatch?.[1] === "subscript";

	return { text, bold, italic, sizeHp, superscript, subscript };
}
