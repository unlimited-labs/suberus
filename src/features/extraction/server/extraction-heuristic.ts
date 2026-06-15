import type { DocParagraph } from "./docx-parser";
import type { ExtractedAuthor } from "./extraction";
import { INSTITUTION_RE, KEYWORDS_RE } from "./extraction-patterns";
import type { ClassifiedPara } from "./extraction-zones";

export interface AuthorSegment {
	name: string;
	markers: string[];
}

export function extractFromZones(classified: ClassifiedPara[]): {
	title?: string;
	authors?: ExtractedAuthor[];
	keywords?: string[];
} {
	const titleParas = classified.filter((c) => c.zone === "TITLE");
	const authorParas = classified.filter((c) => c.zone === "AUTHORS");
	const affParas = classified.filter((c) => c.zone === "AFFILIATIONS");
	const emailParas = classified.filter((c) => c.zone === "EMAILS");
	const kwParas = classified.filter((c) => c.zone === "KEYWORDS");

	const title = titleParas
		.map((c) => c.para.text.trim())
		.join(" ")
		.trim();
	const affiliations = parseAffiliations(affParas);
	const emails = extractEmails([...emailParas, ...affParas]);
	const authors = extractAuthors(authorParas, affiliations, emails);
	const keywords = extractKeywords(kwParas);

	return {
		title: title || undefined,
		authors: authors.length > 0 ? authors : undefined,
		keywords: keywords.length > 0 ? keywords : undefined,
	};
}

/** Trim trailing punctuation and drop a trailing "e-mail: ..." suffix. */
function stripEmailSuffix(raw: string): string {
	const text = raw.replace(/[;,]\s*$/, "").trim();
	const emailIdx = text.search(/e-?mail\s*:/i);
	if (emailIdx > 0) {
		return text
			.slice(0, emailIdx)
			.replace(/[;,]\s*$/, "")
			.trim();
	}
	return text;
}

export function parseAffiliations(
	paras: ClassifiedPara[],
): Map<string, string> {
	const map = new Map<string, string>();
	let unmarkedIndex = 0;

	for (const { para } of paras) {
		const text = para.text.trim();
		if (text.length === 0 || /^\*?correspondence/i.test(text)) continue;

		// Skip address-only lines (postal code without institution)
		if (/^\d{2}-\d{3}\s/.test(text) && !INSTITUTION_RE.test(text)) {
			// Append to previous affiliation if exists
			const lastKey = [...map.keys()].pop();
			if (lastKey) {
				map.set(lastKey, `${map.get(lastKey)}, ${text}`);
			}
			continue;
		}

		const match = text.match(/^(\d+|\*|†|‡|§)[).\s]*(.+)/);
		if (match) {
			map.set(match[1], stripEmailSuffix(match[2]));
		} else if (INSTITUTION_RE.test(text)) {
			// Unmarked affiliation — assign sequential number
			map.set(`_unmarked_${unmarkedIndex++}`, stripEmailSuffix(text));
		}
	}
	return map;
}

export function extractEmails(paras: ClassifiedPara[]): string[] {
	let allText = paras.map((c) => c.para.text).join(" ");

	// Expand curly-brace email shorthand: {a,b,c}@domain → a@domain, b@domain, c@domain
	allText = allText.replace(
		/\{([^}]+)\}@([\w.\-À-žĄ-ż]+\.\w{2,})/g,
		(_, users: string, domain: string) =>
			users
				.split(",")
				.map((u) => `${u.trim()}@${domain}`)
				.join(", "),
	);

	const matches = allText.match(/[\w.+\-À-žĄ-ż]+@[\w.\-À-žĄ-ż]+\.\w{2,}/g);
	if (!matches) return [];
	return [...new Set(matches.map((e) => e.toLowerCase()))];
}

/** Link a segment to its affiliation via markers, falling back to a shared one. */
function resolveAffiliation(
	seg: AuthorSegment,
	affiliations: Map<string, string>,
	sharedAff: string | undefined,
): string | undefined {
	if (seg.markers.length > 0 && affiliations.size > 0) {
		const joined = seg.markers
			.map((m) => affiliations.get(m))
			.filter(Boolean)
			.join("; ");
		if (joined.length > 0) return joined;
	}
	return sharedAff;
}

export function extractAuthors(
	paras: ClassifiedPara[],
	affiliations: Map<string, string>,
	emails: string[],
): ExtractedAuthor[] {
	const authors: ExtractedAuthor[] = [];
	// If only one affiliation (marked or unmarked), share it across all authors
	const affValues = [...affiliations.values()];
	const sharedAff = affValues.length === 1 ? affValues[0] : undefined;

	for (const { para } of paras) {
		for (const seg of extractAuthorSegments(para)) {
			const parsed = parseName(seg.name);
			if (!parsed) continue;

			const affiliationName = resolveAffiliation(seg, affiliations, sharedAff);
			authors.push({
				...parsed,
				email: emails[authors.length],
				affiliationName,
			});
		}
	}

	return authors;
}

/** Merge consecutive superscript runs into markers: "1,2" → ["1","2"]. */
function parseMarkers(runText: string): string[] {
	return runText
		.replace(/[)*,\s]/g, " ")
		.split(/\s+/)
		.filter((m) => m.length > 0);
}

/**
 * A new author starts when text follows a superscript without a leading
 * comma/semicolon and begins with an uppercase letter.
 * Handles "Karbowniczek^1^ Pradeep" (space-separated) alongside the
 * comma-separated "Korpala^1,2^, Bzowski^3^" case.
 */
function startsNewAuthor(
	prevWasSuperscript: boolean,
	currentName: string,
	text: string,
): boolean {
	return (
		prevWasSuperscript &&
		currentName.trim().length > 0 &&
		!/^[,;]/.test(text.trimStart()) &&
		/[A-ZÀ-ŽĄ-Ż]/.test(text.trim()[0] ?? "")
	);
}

export function extractAuthorSegments(para: DocParagraph): AuthorSegment[] {
	const { runs } = para;
	if (runs.length === 0) return [];

	const segments: AuthorSegment[] = [];
	let currentName = "";
	let currentMarkers: string[] = [];
	let prevWasSuperscript = false;

	const flush = () => {
		if (currentName.trim().length > 0) {
			segments.push({ name: cleanName(currentName), markers: currentMarkers });
		}
		currentName = "";
		currentMarkers = [];
	};

	for (const run of runs) {
		if (run.superscript) {
			currentMarkers.push(...parseMarkers(run.text));
			prevWasSuperscript = true;
			continue;
		}

		const text = run.text;
		// Skip whitespace-only runs but keep prevWasSuperscript state
		if (text.trim().length === 0) {
			currentName += text;
			continue;
		}

		if (startsNewAuthor(prevWasSuperscript, currentName, text)) {
			flush();
		}

		// Split on commas within the run
		const parts = text.split(",");
		for (let i = 0; i < parts.length; i++) {
			if (i > 0) flush();
			currentName += parts[i];
		}
		prevWasSuperscript = false;
	}

	flush();
	return segments;
}

export function cleanName(name: string): string {
	return name
		.replace(/[*†‡§]/g, "")
		.replace(/\s+-\s+/g, "-")
		.replace(/\s+/g, " ")
		.trim();
}

export function parseName(
	raw: string,
): { firstName: string; lastName: string } | null {
	const normalized = raw.replace(/\s+-\s+/g, "-").trim();
	const parts = normalized
		.split(/\s+/)
		.filter((p) => p.length > 0 && /[a-zA-ZÀ-žĄ-ż]/.test(p));

	if (parts.length < 2) return null;

	const valid = parts.every((p) =>
		p.split("-").every((seg) => /^[A-ZÀ-ŽĄ-Ż]/.test(seg)),
	);
	if (!valid) return null;

	return {
		firstName: parts.slice(0, -1).join(" "),
		lastName: parts[parts.length - 1],
	};
}

export function extractKeywords(paras: ClassifiedPara[]): string[] {
	if (paras.length === 0) return [];
	const allText = paras.map((c) => c.para.text.trim()).join("\n");

	const inlineMatch = allText.match(
		/(?:key\s*words?|keywords?|słowa\s*kluczowe)\s*[:：]\s*(.+)/i,
	);
	if (inlineMatch) return parseKwString(inlineMatch[1]);

	const lines = allText.split("\n").filter((l) => l.trim().length > 0);
	for (let i = 0; i < lines.length; i++) {
		if (
			KEYWORDS_RE.test(lines[i]) &&
			lines[i].replace(KEYWORDS_RE, "").trim().length === 0
		) {
			if (i + 1 < lines.length) return parseKwString(lines[i + 1]);
		}
	}

	return [];
}

export function parseKwString(raw: string): string[] {
	return raw
		.split(/[,;]/)
		.map((k) => k.trim())
		.filter((k) => k.length > 0 && k.length < 100)
		.map((k) => k.replace(/\.+$/, "").trim())
		.filter((k) => k.length > 0);
}
