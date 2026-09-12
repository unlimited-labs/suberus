import { generateWithLlm } from "@/shared/server/llm";
import type { ExtractionResult } from "./extraction";
import { parseLlmResponse } from "./extraction-llm-parse";
import {
	MAX_TOKEN_ESTIMATE,
	MIN_TOKEN_ESTIMATE,
	TOKEN_OVERHEAD,
	TOKENS_PER_AUTHOR,
} from "./extraction-patterns";

// Short field names: ~30% fewer output tokens
const LLM_SYSTEM_PROMPT = `Extract academic paper metadata as JSON. Schema: {"t":"title","a":[{"fn":"firstName","ln":"lastName","e":"email","af":"affiliation"}],"k":["keyword"]}
Rules:
1. Each PERSON appears ONCE in "a". If "Smith 1,2" it means Smith has 2 affiliations — join them with "; " in "af", do NOT duplicate the person.
2. "e" and "af" MUST be inside each author object.
3. Clean emails only (user@domain.com).
4. "k" = ONLY from explicit "Keywords:" section. If no Keywords section exists, return empty "k":[].
5. ALL authors. Raw JSON, no markdown.`;

export function estimateMaxTokens(headerText: string): number {
	const lines = headerText.split("\n");

	let authorCount = 0;
	for (let i = 1; i < lines.length; i++) {
		const l = lines[i];
		if (/@/.test(l) || /keyword/i.test(l)) continue;
		if (!l.includes(",")) continue;

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

	const estimated = authorCount * TOKENS_PER_AUTHOR + TOKEN_OVERHEAD;
	return Math.min(MAX_TOKEN_ESTIMATE, Math.max(MIN_TOKEN_ESTIMATE, estimated));
}

export async function extractWithLlm(
	plainText: string,
): Promise<ExtractionResult> {
	if (plainText.trim().length === 0) return {};
	return parseLlmResponse(
		await generateWithLlm({
			system: LLM_SYSTEM_PROMPT,
			user: plainText,
			maxTokens: estimateMaxTokens(plainText),
		}),
	);
}
