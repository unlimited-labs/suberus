import {
	checkPdfApiHealth,
	getPdfApiMarkdown,
} from "@/features/extraction/server/pdf-api";
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
	acknowledgment?: string;
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
			const pdfApiMd = await getPdfApiMarkdown(buffer, fileName);
			if (pdfApiMd) return cutAtAbstract(pdfApiMd);
		}
		return classified
			.flatMap((c) =>
				c.zone === "BODY" || c.zone === "ACKNOWLEDGMENT"
					? []
					: [c.para.text.trim()],
			)
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
		await onStage?.("pdf-api", 2);
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

	const health = await checkPdfApiHealth();
	if (health.status !== "healthy") {
		throw new Error(
			`PDF extraction unavailable: pdf-api service is ${health.message}`,
		);
	}

	await onStage?.("pdf-api", 2);
	const pdfApiMd = await getPdfApiMarkdown(buffer, fileName);
	if (!pdfApiMd) return {};

	await onStage?.("ai", 2);
	const llmInput = cutAtAbstract(pdfApiMd);
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

// Note: rules check FOUND authors only. If heuristic finds 2/5 authors
// with complete data, confidence is HIGH. We can't detect missing authors
// without knowing expected count, which is not available from heuristics.

export function isLowConfidence(result: ExtractionResult): boolean {
	if (!result.title) return true;
	if (result.title.length > MAX_TITLE_LENGTH) return true;
	if (!result.authors || result.authors.length === 0) return true;
	if (
		result.authors.some(
			(a) =>
				SUSPICIOUS_NAME_CHARS.test(a.firstName) ||
				SUSPICIOUS_NAME_CHARS.test(a.lastName),
		)
	)
		return true;
	if (result.authors.every((a) => !a.affiliationName)) return true;
	if (result.authors.some((a) => !a.email || !EMAIL_RE_STRICT.test(a.email)))
		return true;

	return false;
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
	const title = heuristic.title || ai.title;

	const keywords = heuristic.keywords;

	let authors = heuristic.authors;

	if (authors && authors.length > 0 && ai.authors && ai.authors.length > 0) {
		authors = authors.map((hAuthor) => {
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
				email: hAuthor.email || aiMatch.email,
				affiliationName: hAuthor.affiliationName || aiMatch.affiliationName,
			};
		});
	} else if (!authors || authors.length === 0) {
		authors = ai.authors;
	}

	return { title, authors, keywords, acknowledgment: heuristic.acknowledgment };
}
