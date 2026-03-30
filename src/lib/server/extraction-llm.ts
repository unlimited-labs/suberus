import type { ExtractionResult } from "./extraction";
import {
	MAX_TOKEN_ESTIMATE,
	MIN_TOKEN_ESTIMATE,
	TOKEN_OVERHEAD,
	TOKENS_PER_AUTHOR,
} from "./extraction-patterns";
import { generateWithLlm } from "./llm";

// Short field names: ~30% fewer output tokens
// t=title, a=authors, fn=firstName, ln=lastName, e=email, af=affiliationName, k=keywords
const LLM_SYSTEM_PROMPT = `Extract academic paper metadata as JSON. Schema: {"t":"title","a":[{"fn":"firstName","ln":"lastName","e":"email","af":"affiliation"}],"k":["keyword"]}
Rules:
1. Each PERSON appears ONCE in "a". If "Smith 1,2" it means Smith has 2 affiliations — join them with "; " in "af", do NOT duplicate the person.
2. "e" and "af" MUST be inside each author object.
3. Clean emails only (user@domain.com).
4. "k" = ONLY from explicit "Keywords:" section. If no Keywords section exists, return empty "k":[].
5. ALL authors. Raw JSON, no markdown.`;

/** Estimate max_tokens based on header content */
export function estimateMaxTokens(headerText: string): number {
	const lines = headerText.split("\n");

	// Skip first line (title), find author line: comma-separated capitalized names, no emails
	let authorCount = 0;
	for (let i = 1; i < lines.length; i++) {
		const l = lines[i];
		if (/@/.test(l) || /keyword/i.test(l)) continue;
		if (!l.includes(",")) continue;

		// Check if segments look like names (2-4 words each, capitalized)
		const segments = l
			.split(",")
			.map((s) => s.trim())
			.filter((s) => s.length > 2);
		const nameSegments = segments.filter(
			(s) =>
				s
					.replace(/[\d()*†‡§,.]/g, "")
					.trim()
					.split(/\s+/).length >= 2,
		);
		if (nameSegments.length >= 2) {
			authorCount = nameSegments.length;
			break;
		}
	}

	if (authorCount === 0) return MAX_TOKEN_ESTIMATE;

	// ~70 tokens per author (short field names) + overhead
	const estimated = authorCount * TOKENS_PER_AUTHOR + TOKEN_OVERHEAD;
	return Math.min(MAX_TOKEN_ESTIMATE, Math.max(MIN_TOKEN_ESTIMATE, estimated));
}

export async function extractWithLlm(
	plainText: string,
): Promise<ExtractionResult> {
	if (plainText.trim().length === 0) return {};
	const maxTokens = estimateMaxTokens(plainText);
	const response = await generateWithLlm({
		system: LLM_SYSTEM_PROMPT,
		user: plainText,
		maxTokens,
	});

	const jsonMatch = response.match(/\{[\s\S]*\}/);
	if (!jsonMatch) return {};

	const cleaned = jsonMatch[0]
		.replace(/,\s*\n\s*[\d.]+\)/g, "")
		.replace(/,\s*}/g, "}")
		.replace(/,\s*]/g, "]");

	try {
		const raw = JSON.parse(cleaned) as Record<string, unknown>;

		// Normalize short/long field names
		const parsed = {
			title: raw.t ?? raw.title,
			authors: raw.a ?? raw.authors,
			keywords: raw.k ?? raw.keywords,
			emails: raw.emails,
			affiliations: raw.affiliations,
		};

		const result: ExtractionResult = {};

		if (typeof parsed.title === "string" && parsed.title.length > 0)
			result.title = parsed.title.trim();

		const sepEmails = extractSepEmails(parsed.emails);
		const sepAffs = extractSepAffs(parsed.affiliations);

		if (Array.isArray(parsed.authors)) {
			result.authors = (parsed.authors as Record<string, unknown>[])
				.filter((a) => {
					// Accept both short (fn/ln) and long (firstName/lastName) field names
					const fn = a.fn ?? a.firstName;
					const ln = a.ln ?? a.lastName;
					return typeof fn === "string" && typeof ln === "string";
				})
				.map((a, i) => {
					const fn = ((a.fn ?? a.firstName) as string).trim();
					const ln = ((a.ln ?? a.lastName) as string).trim();
					const rawEmail =
						(typeof (a.e ?? a.email) === "string"
							? ((a.e ?? a.email) as string).trim()
							: null) ||
						sepEmails[i] ||
						null;
					const email = rawEmail
						? rawEmail.match(/[\w.+-]+@[\w.-]+\.\w{2,}/)?.[0]?.toLowerCase()
						: undefined;
					const rawAff = a.af ?? a.affiliationName;
					const affiliationName =
						(typeof rawAff === "string" ? rawAff.trim() : null) ||
						sepAffs[i] ||
						undefined;
					return {
						firstName: fn,
						lastName: ln,
						email,
						affiliationName,
					};
				});
		}

		if (Array.isArray(parsed.keywords))
			result.keywords = parsed.keywords
				.filter((k): k is string => typeof k === "string")
				.map((k) => k.trim())
				.filter((k) => k.length > 0);

		return result;
	} catch {
		return {};
	}
}

function extractSepEmails(val: unknown): string[] {
	if (!val) return [];
	if (Array.isArray(val))
		return val
			.map((e) => (typeof e === "string" ? e.trim() : ""))
			.filter((e) => e.includes("@"));
	if (typeof val === "object") {
		const obj = val as Record<string, string>;
		return Object.keys(obj)
			.sort()
			.map((k) => (typeof obj[k] === "string" ? obj[k].trim() : ""))
			.filter((e) => e.includes("@"));
	}
	return [];
}

function extractSepAffs(val: unknown): string[] {
	if (!val || !Array.isArray(val)) return [];
	return val.map((a) => {
		if (typeof a === "string") return a.trim();
		if (typeof a === "object" && a !== null) {
			const o = a as Record<string, string>;
			return [o.institution || o.name || "", o.address || "", o.country || ""]
				.map((p) => p.trim())
				.filter(Boolean)
				.join(", ");
		}
		return "";
	});
}
