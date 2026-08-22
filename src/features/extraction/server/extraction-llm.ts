import { z } from "zod";
import { generateWithLlm } from "@/shared/server/llm";
import type { ExtractionResult } from "./extraction";
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

const optionalText = z.string().optional().catch(undefined);

const llmAuthorSchema = z.object({
	fn: optionalText,
	firstName: optionalText,
	ln: optionalText,
	lastName: optionalText,
	e: optionalText,
	email: optionalText,
	af: optionalText,
	affiliationName: optionalText,
});

const sepEmailsSchema = z
	.union([
		z.array(z.string().catch("")),
		z.record(z.string(), z.string().catch("")),
	])
	.catch([])
	.transform((value) =>
		Array.isArray(value)
			? value
			: Object.keys(value)
					.sort()
					.map((key) => value[key] ?? ""),
	)
	.transform((list) =>
		list.flatMap((entry) => {
			const trimmed = entry.trim();
			return trimmed.includes("@") ? [trimmed] : [];
		}),
	);

const sepAffsSchema = z
	.array(
		z
			.union([
				z.string(),
				z
					.object({
						institution: optionalText,
						name: optionalText,
						address: optionalText,
						country: optionalText,
					})
					.transform((o) =>
						[o.institution || o.name || "", o.address || "", o.country || ""]
							.map((part) => part.trim())
							.filter(Boolean)
							.join(", "),
					),
			])
			.catch(""),
	)
	.catch([])
	.transform((list) => list.map((entry) => entry.trim()));

/** The model answers with short or long field names; accept both, drop the rest. */
const llmResponseSchema = z.object({
	t: optionalText,
	title: optionalText,
	a: z.array(llmAuthorSchema).optional().catch(undefined),
	authors: z.array(llmAuthorSchema).optional().catch(undefined),
	k: z.array(z.string().catch("")).optional().catch(undefined),
	keywords: z.array(z.string().catch("")).optional().catch(undefined),
	emails: sepEmailsSchema,
	affiliations: sepAffsSchema,
});

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
		const parsed = llmResponseSchema.safeParse(JSON.parse(cleaned));
		if (!parsed.success) return {};
		const raw = parsed.data;

		const result: ExtractionResult = {};

		const title = (raw.t ?? raw.title)?.trim();
		if (title) result.title = title;

		const sepEmails = raw.emails;
		const sepAffs = raw.affiliations;

		const authorList = raw.a ?? raw.authors;
		if (authorList) {
			const authors: NonNullable<typeof result.authors> = [];
			for (const a of authorList) {
				const fn = a.fn ?? a.firstName;
				const ln = a.ln ?? a.lastName;
				if (!fn || !ln) continue;
				// Separate email/affiliation lists are positional over kept authors.
				const i = authors.length;
				const rawEmail = (a.e ?? a.email)?.trim() || sepEmails[i] || null;
				const email = rawEmail
					? rawEmail.match(/[\w.+-]+@[\w.-]+\.\w{2,}/)?.[0]?.toLowerCase()
					: undefined;
				const affiliationName =
					(a.af ?? a.affiliationName)?.trim() || sepAffs[i] || undefined;
				authors.push({
					firstName: fn.trim(),
					lastName: ln.trim(),
					email,
					affiliationName,
				});
			}
			result.authors = authors;
		}

		const keywordList = raw.k ?? raw.keywords;
		if (keywordList)
			result.keywords = keywordList.flatMap((k) =>
				k.trim() ? [k.trim()] : [],
			);

		return result;
	} catch {
		return {};
	}
}
