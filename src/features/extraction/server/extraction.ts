import {
	checkDoclingHealth,
	getDoclingMarkdown,
} from "@/features/extraction/server/docling";
import { checkLlmHealth } from "@/shared/server/llm";
import { parseDocx } from "./docx-parser";
import { extractFromZones } from "./extraction-heuristic";
import { extractWithLlm } from "./extraction-llm";
import {
	EMAIL_RE_STRICT,
	MAX_HEADER_FALLBACK,
	MAX_TITLE_LENGTH,
	SUSPICIOUS_NAME_CHARS,
} from "./extraction-patterns";
import { classifyZones } from "./extraction-zones";

export interface ExtractedAuthor {
	firstName: string;
	lastName: string;
	email?: string;
	affiliationName?: string;
}

export interface ExtractionResult {
	title?: string;
	authors?: ExtractedAuthor[];
	keywords?: string[];
}

export interface ExtractionConfig {
	heuristic: boolean;
	ai: boolean;
}

export type StageReporter = (
	stage: string,
	totalStages: number,
) => Promise<void>;

function cutAtAbstract(md: string): string {
	const headerEnd = md.search(
		/\n\s*(\*\*)?(Abstract|Introduction|ABSTRACT|\d+\.\s)/,
	);
	return headerEnd > 0
		? md.slice(0, headerEnd)
		: md.slice(0, MAX_HEADER_FALLBACK);
}

export async function extractFromDocx(
	buffer: Buffer,
	config: ExtractionConfig,
	fileName?: string,
	onStage?: StageReporter,
): Promise<ExtractionResult> {
	const paragraphs = parseDocx(buffer);
	const classified = classifyZones(paragraphs);

	async function getLlmInput(): Promise<string> {
		if (fileName) {
			const doclingMd = await getDoclingMarkdown(buffer, fileName);
			if (doclingMd) return cutAtAbstract(doclingMd);
		}
		return classified
			.filter((c) => c.zone !== "BODY")
			.map((c) => c.para.text.trim())
			.join("\n");
	}

	if (config.heuristic && config.ai) {
		await onStage?.("heuristic", 2);
		const heuristic = extractFromZones(classified);
		if (isLowConfidence(heuristic)) {
			await onStage?.("ai", 2);
			const llmInput = await getLlmInput();
			const aiResult = await tryLlmExtraction(llmInput);
			if (aiResult) return mergeResults(heuristic, aiResult);
		}
		return heuristic;
	}

	if (config.heuristic) {
		await onStage?.("heuristic", 1);
		return extractFromZones(classified);
	}

	if (config.ai) {
		await onStage?.("docling", 2);
		const llmInput = await getLlmInput();
		await onStage?.("ai", 2);
		const aiResult = await tryLlmExtraction(llmInput);
		return aiResult ?? {};
	}

	return {};
}

export async function extractFromPdf(
	buffer: Buffer,
	fileName: string,
	config: ExtractionConfig,
	onStage?: StageReporter,
): Promise<ExtractionResult> {
	if (!config.ai) return {};

	const health = await checkDoclingHealth();
	if (health.status !== "healthy") {
		throw new Error(
			`PDF extraction unavailable: docling service is ${health.message}`,
		);
	}

	await onStage?.("docling", 2);
	const doclingMd = await getDoclingMarkdown(buffer, fileName);
	if (!doclingMd) return {};

	await onStage?.("ai", 2);
	const llmInput = cutAtAbstract(doclingMd);
	const aiResult = await tryLlmExtraction(llmInput);
	return aiResult ?? {};
}

async function tryLlmExtraction(
	plainText: string,
): Promise<ExtractionResult | null> {
	const health = await checkLlmHealth();
	if (health.status !== "healthy") return null;
	try {
		return await extractWithLlm(plainText);
	} catch (error) {
		console.error("[extraction] LLM extraction failed:", error);
		return null;
	}
}

// --- Confidence check ---
//
// Determines whether LLM fallback should trigger.
// LOW confidence → LLM is called with docling markdown (or XML header text).
//
// Rules (ANY triggers LOW):
//   1. No title found                          — fundamental extraction failure
//   2. Title > 300 chars                        — probably grabbed a paragraph, not title
//   3. No authors found                         — fundamental extraction failure
//   4. Suspicious chars in names (){}[]<>@#$... — XML/formatting artifact in parsed name
//   5. No affiliations for ALL authors          — template structure likely not parsed
//   6. Missing/invalid email for ANY author     — incomplete extraction
//
// Note: rules check FOUND authors only. If heuristic finds 2/5 authors
// with complete data, confidence is HIGH. We can't detect missing authors
// without knowing expected count, which is not available from heuristics.

export function isLowConfidence(result: ExtractionResult): boolean {
	// Rule 1: no title
	if (!result.title) return true;
	// Rule 2: title too long (probably a paragraph)
	if (result.title.length > MAX_TITLE_LENGTH) return true;
	// Rule 3: no authors
	if (!result.authors || result.authors.length === 0) return true;
	// Rule 4: parsing artifacts in names
	if (
		result.authors.some(
			(a) =>
				SUSPICIOUS_NAME_CHARS.test(a.firstName) ||
				SUSPICIOUS_NAME_CHARS.test(a.lastName),
		)
	)
		return true;
	// Rule 5: no affiliations at all
	if (result.authors.every((a) => !a.affiliationName)) return true;
	// Rule 6: any author missing a valid email
	if (result.authors.some((a) => !a.email || !EMAIL_RE_STRICT.test(a.email)))
		return true;

	return false;
}

// --- Language detection ---

export function detectLanguage(text: string): "pl" | "en" | "other" {
	const polishCount = (text.match(/[ąęćźżółśń]/gi) || []).length;
	if (text.length > 0 && polishCount / text.length > 0.005) return "pl";
	const stopCount = (
		text.match(
			/\b(jest|nie|się|jak|dla|lub|oraz|może|tylko|przez|które|tego)\b/gi,
		) || []
	).length;
	if (stopCount > 3) return "pl";
	return "en";
}

/**
 * Merge heuristic and AI results. Strategy:
 *   - Title: heuristic preferred, AI fallback
 *   - Keywords: heuristic ONLY (LLM hallucinates keywords from abstract text)
 *   - Authors: heuristic count (LLM hallucinates extra authors),
 *     enriched with AI emails/affiliations matched by name
 *   - If heuristic found 0 authors, use AI authors entirely
 */
export function mergeResults(
	heuristic: ExtractionResult,
	ai: ExtractionResult,
): ExtractionResult {
	// Title: prefer heuristic, fallback to AI
	const title = heuristic.title || ai.title;

	// Keywords: trust heuristic only — LLM tends to generate from abstract text
	const keywords = heuristic.keywords;

	// Authors: trust heuristic count (LLM hallucinates extra authors)
	// but enrich heuristic authors with AI data (emails, affiliations)
	let authors = heuristic.authors;

	if (authors && authors.length > 0 && ai.authors && ai.authors.length > 0) {
		// Enrich each heuristic author with matching AI data
		authors = authors.map((hAuthor) => {
			// Find matching AI author by name similarity
			const aiMatch = ai.authors?.find(
				(a) =>
					a.lastName.toLowerCase() === hAuthor.lastName.toLowerCase() &&
					a.firstName
						.toLowerCase()
						.startsWith(hAuthor.firstName.toLowerCase().slice(0, 3)),
			);
			if (!aiMatch) return hAuthor;

			return {
				firstName: hAuthor.firstName,
				lastName: hAuthor.lastName,
				// Fill missing email from AI
				email: hAuthor.email || aiMatch.email,
				// Fill missing affiliation from AI
				affiliationName: hAuthor.affiliationName || aiMatch.affiliationName,
			};
		});
	} else if (!authors || authors.length === 0) {
		// Heuristic found nothing — use AI authors entirely
		authors = ai.authors;
	}

	return { title, authors, keywords };
}
