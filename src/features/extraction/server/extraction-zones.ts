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

interface ZoneContext {
	text: string;
	para: DocParagraph;
	fontSize: number;
	maxSize: number;
}

interface ZoneStep {
	assign: Zone;
	next: Zone;
}

const isBodyStart = (text: string) =>
	BODY_START_RE.test(text) || SECTION_RE.test(text);

function stepFromTitle(): ZoneStep {
	return { assign: "TITLE", next: "AUTHORS" };
}

function stepFromAuthors({
	text,
	para,
	fontSize,
	maxSize,
}: ZoneContext): ZoneStep {
	if (isBodyStart(text)) return { assign: "BODY", next: "BODY" };
	if (KEYWORDS_RE.test(text)) return { assign: "KEYWORDS", next: "KEYWORDS" };
	if (EMAIL_RE.test(text) && !looksLikeAuthorLine(para)) {
		return { assign: "EMAILS", next: "EMAILS" };
	}
	if (looksLikeAffiliation(text, para)) {
		return { assign: "AFFILIATIONS", next: "AFFILIATIONS" };
	}
	if (
		looksLikeAuthorLine(para) ||
		(maxSize > 0 && fontSize < maxSize && fontSize > 0) ||
		looksLikePersonName(text.replace(/[*†‡§]/g, "").trim())
	) {
		return { assign: "AUTHORS", next: "AUTHORS" };
	}
	return { assign: "AFFILIATIONS", next: "AFFILIATIONS" };
}

function stepFromAffiliations({ text, para }: ZoneContext): ZoneStep {
	if (isBodyStart(text)) return { assign: "BODY", next: "BODY" };
	if (KEYWORDS_RE.test(text)) return { assign: "KEYWORDS", next: "KEYWORDS" };
	if (EMAILS_PREFIX_RE.test(text) || EMAIL_RE.test(text)) {
		return { assign: "EMAILS", next: "EMAILS" };
	}
	if (/^\*?correspondence/i.test(text)) {
		return { assign: "AFFILIATIONS", next: "AFFILIATIONS" };
	}
	if (
		looksLikeAffiliation(text, para) ||
		INSTITUTION_RE.test(text) ||
		(text.length < MAX_AFFILIATION_CONTINUATION_LENGTH &&
			!looksLikeAuthorLine(para))
	) {
		return { assign: "AFFILIATIONS", next: "AFFILIATIONS" };
	}
	return { assign: "BODY", next: "BODY" };
}

function stepFromEmails({ text }: ZoneContext): ZoneStep {
	if (isBodyStart(text)) return { assign: "BODY", next: "BODY" };
	if (KEYWORDS_RE.test(text)) return { assign: "KEYWORDS", next: "KEYWORDS" };
	if (EMAIL_RE.test(text)) return { assign: "EMAILS", next: "EMAILS" };
	return { assign: "BODY", next: "BODY" };
}

function stepFromKeywords({ text }: ZoneContext): ZoneStep {
	if (isBodyStart(text)) return { assign: "BODY", next: "BODY" };
	return { assign: "KEYWORDS", next: "BODY" };
}

function stepFromBody({ text }: ZoneContext): ZoneStep {
	if (KEYWORDS_RE.test(text)) return { assign: "KEYWORDS", next: "KEYWORDS" };
	return { assign: "BODY", next: "BODY" };
}

const ZONE_STEPS = {
	TITLE: stepFromTitle,
	AUTHORS: stepFromAuthors,
	AFFILIATIONS: stepFromAffiliations,
	EMAILS: stepFromEmails,
	KEYWORDS: stepFromKeywords,
	BODY: stepFromBody,
} satisfies Record<Zone, (ctx: ZoneContext) => ZoneStep>;

export function classifyZones(paragraphs: DocParagraph[]): ClassifiedPara[] {
	const result: ClassifiedPara[] = [];
	let zone: Zone = "TITLE";

	const maxSize = getMaxFontSize(paragraphs.slice(0, HEADER_SCAN_PARAGRAPHS));

	for (const para of paragraphs) {
		const text = para.text.trim();
		if (text.length === 0) continue;

		const { assign, next } = ZONE_STEPS[zone]({
			text,
			para,
			fontSize: getParaFontSize(para),
			maxSize,
		});
		result.push({ zone: assign, para });
		zone = next;
	}

	return result;
}

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
	const firstRun = para.runs[0];
	if (firstRun?.sizeHp && firstRun.sizeHp <= SMALL_FONT_SIZE_HP) return true;
	// Line starting with space + institution keyword (KomPlasTech template)
	if (/^\s/.test(para.runs[0]?.text ?? "") && INSTITUTION_RE.test(text))
		return true;
	if (INSTITUTION_RE.test(text) && text.length < MAX_AFFILIATION_LINE_LENGTH)
		return true;
	if (/\d{2}-\d{3}\s/.test(text) && text.length < MAX_AFFILIATION_LINE_LENGTH)
		return true;
	return false;
}
