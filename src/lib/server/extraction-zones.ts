import type { DocParagraph } from "./docx-parser";
import {
	AFF_MARKER_RE,
	BODY_START_RE,
	CAPITALIZED_START,
	EMAIL_RE,
	EMAILS_PREFIX_RE,
	HEADER_SCAN_PARAGRAPHS,
	INSTITUTION_RE,
	KEYWORDS_RE,
	MAX_AFFILIATION_CONTINUATION_LENGTH,
	MAX_AFFILIATION_LINE_LENGTH,
	MAX_NAME_LENGTH,
	MAX_PERSON_NAME_LENGTH,
	SECTION_RE,
	SMALL_FONT_SIZE_HP,
} from "./extraction-patterns";

export type Zone =
	| "TITLE"
	| "AUTHORS"
	| "AFFILIATIONS"
	| "EMAILS"
	| "KEYWORDS"
	| "BODY";

export interface ClassifiedPara {
	zone: Zone;
	para: DocParagraph;
}

// --- Zone classification ---

export function classifyZones(paragraphs: DocParagraph[]): ClassifiedPara[] {
	const result: ClassifiedPara[] = [];
	let zone: Zone = "TITLE";

	// Find max font size in first ~6 paragraphs for title detection
	const maxSize = getMaxFontSize(paragraphs.slice(0, HEADER_SCAN_PARAGRAPHS));

	for (const para of paragraphs) {
		const text = para.text.trim();
		if (text.length === 0) continue;

		const fontSize = getParaFontSize(para);

		switch (zone) {
			case "TITLE": {
				// Title: largest font, or first paragraph if no font info
				result.push({ zone: "TITLE", para });
				zone = "AUTHORS";
				break;
			}

			case "AUTHORS": {
				if (BODY_START_RE.test(text) || SECTION_RE.test(text)) {
					zone = "BODY";
					result.push({ zone: "BODY", para });
				} else if (KEYWORDS_RE.test(text)) {
					zone = "KEYWORDS";
					result.push({ zone: "KEYWORDS", para });
				} else if (EMAIL_RE.test(text) && !looksLikeAuthorLine(para)) {
					zone = "EMAILS";
					result.push({ zone: "EMAILS", para });
				} else if (looksLikeAffiliation(text, para)) {
					zone = "AFFILIATIONS";
					result.push({ zone: "AFFILIATIONS", para });
				} else if (
					looksLikeAuthorLine(para) ||
					(maxSize > 0 && fontSize < maxSize && fontSize > 0) ||
					looksLikePersonName(text.replace(/[*†‡§]/g, "").trim())
				) {
					result.push({ zone: "AUTHORS", para });
				} else {
					// Ambiguous — treat as affiliation (safer than body)
					zone = "AFFILIATIONS";
					result.push({ zone: "AFFILIATIONS", para });
				}
				break;
			}

			case "AFFILIATIONS": {
				if (BODY_START_RE.test(text) || SECTION_RE.test(text)) {
					zone = "BODY";
					result.push({ zone: "BODY", para });
				} else if (KEYWORDS_RE.test(text)) {
					zone = "KEYWORDS";
					result.push({ zone: "KEYWORDS", para });
				} else if (EMAILS_PREFIX_RE.test(text) || EMAIL_RE.test(text)) {
					zone = "EMAILS";
					result.push({ zone: "EMAILS", para });
				} else if (/^\*?correspondence/i.test(text)) {
					result.push({ zone: "AFFILIATIONS", para });
				} else if (
					looksLikeAffiliation(text, para) ||
					INSTITUTION_RE.test(text) ||
					// Continuation of affiliation: address-like or short non-body text
					(text.length < MAX_AFFILIATION_CONTINUATION_LENGTH &&
						!looksLikeAuthorLine(para))
				) {
					result.push({ zone: "AFFILIATIONS", para });
				} else {
					zone = "BODY";
					result.push({ zone: "BODY", para });
				}
				break;
			}

			case "EMAILS": {
				if (BODY_START_RE.test(text) || SECTION_RE.test(text)) {
					zone = "BODY";
					result.push({ zone: "BODY", para });
				} else if (KEYWORDS_RE.test(text)) {
					zone = "KEYWORDS";
					result.push({ zone: "KEYWORDS", para });
				} else if (EMAIL_RE.test(text)) {
					result.push({ zone: "EMAILS", para });
				} else {
					zone = "BODY";
					result.push({ zone: "BODY", para });
				}
				break;
			}

			case "KEYWORDS": {
				if (BODY_START_RE.test(text) || SECTION_RE.test(text)) {
					zone = "BODY";
					result.push({ zone: "BODY", para });
				} else {
					result.push({ zone: "KEYWORDS", para });
					zone = "BODY";
				}
				break;
			}

			case "BODY": {
				if (KEYWORDS_RE.test(text)) {
					zone = "KEYWORDS";
					result.push({ zone: "KEYWORDS", para });
				} else {
					result.push({ zone: "BODY", para });
				}
				break;
			}
		}
	}

	return result;
}

// --- Feature helpers ---

export function getParaFontSize(para: DocParagraph): number {
	for (const run of para.runs) {
		if (run.sizeHp && !run.superscript && !run.subscript) {
			return run.sizeHp;
		}
	}
	return 0;
}

export function getMaxFontSize(paragraphs: DocParagraph[]): number {
	let max = 0;
	for (const p of paragraphs) {
		const sz = getParaFontSize(p);
		if (sz > max) max = sz;
	}
	return max;
}

export function looksLikePersonName(text: string): boolean {
	const words = text.split(/\s+/);
	return (
		words.length >= 2 &&
		words.length <= 4 &&
		words.every(
			(w) =>
				w.split("-").every((seg) => CAPITALIZED_START.test(seg)) &&
				w.length <= MAX_NAME_LENGTH,
		) &&
		text.length < MAX_PERSON_NAME_LENGTH
	);
}

export function looksLikeAuthorLine(para: DocParagraph): boolean {
	const text = para.text.trim();
	const hasSuperscript = para.runs.some((r) => r.superscript);
	const hasCommas = text.includes(",");
	const startsCapitalized = CAPITALIZED_START.test(text);

	return (
		(hasCommas && startsCapitalized) ||
		hasSuperscript ||
		looksLikePersonName(text.replace(/[*†‡§]/g, "").trim())
	);
}

export function looksLikeAffiliation(
	text: string,
	para: DocParagraph,
): boolean {
	if (AFF_MARKER_RE.test(text)) return true;
	// Small font first run with marker
	const firstRun = para.runs[0];
	if (firstRun?.sizeHp && firstRun.sizeHp <= SMALL_FONT_SIZE_HP) return true;
	// Line starting with space + institution keyword (KomPlasTech template)
	if (/^\s/.test(para.runs[0]?.text ?? "") && INSTITUTION_RE.test(text))
		return true;
	// Just institution keyword on its own line
	if (INSTITUTION_RE.test(text) && text.length < MAX_AFFILIATION_LINE_LENGTH)
		return true;
	// Address-like line (postal code patterns)
	if (/\d{2}-\d{3}\s/.test(text) && text.length < MAX_AFFILIATION_LINE_LENGTH)
		return true;
	return false;
}
