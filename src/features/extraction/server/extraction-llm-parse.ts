import { z } from "zod";
import type { ExtractionResult } from "./extraction";

const optionalText = z.string().optional().catch(undefined);

const llmAuthorSchema = z
	.object({
		fn: optionalText,
		firstName: optionalText,
		ln: optionalText,
		lastName: optionalText,
		e: optionalText,
		email: optionalText,
		af: optionalText,
		affiliationName: optionalText,
	})
	.transform((a) => ({
		firstName: a.fn ?? a.firstName,
		lastName: a.ln ?? a.lastName,
		email: a.e ?? a.email,
		affiliationName: a.af ?? a.affiliationName,
	}));

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

/** The model answers with short or long field names; accept both, emit one shape. */
const llmResponseSchema = z
	.object({
		t: optionalText,
		title: optionalText,
		a: z.array(llmAuthorSchema).optional().catch(undefined),
		authors: z.array(llmAuthorSchema).optional().catch(undefined),
		k: z.array(z.string().catch("")).optional().catch(undefined),
		keywords: z.array(z.string().catch("")).optional().catch(undefined),
		emails: sepEmailsSchema,
		affiliations: sepAffsSchema,
	})
	.transform((r) => ({
		title: r.t ?? r.title,
		authors: r.a ?? r.authors,
		keywords: r.k ?? r.keywords,
		emails: r.emails,
		affiliations: r.affiliations,
	}));

type LlmAuthor = z.infer<typeof llmAuthorSchema>;
type ExtractedAuthors = NonNullable<ExtractionResult["authors"]>;

/** Separate email/affiliation lists are positional over the authors we keep. */
function mapAuthors(
	authorList: LlmAuthor[],
	sepEmails: string[],
	sepAffs: string[],
): ExtractedAuthors {
	const authors: ExtractedAuthors = [];
	for (const a of authorList) {
		if (!a.firstName || !a.lastName) continue;
		const i = authors.length;
		const rawEmail = a.email?.trim() || sepEmails[i] || null;
		authors.push({
			firstName: a.firstName.trim(),
			lastName: a.lastName.trim(),
			email: rawEmail
				? rawEmail.match(/[\w.+-]+@[\w.-]+\.\w{2,}/)?.[0]?.toLowerCase()
				: undefined,
			affiliationName: a.affiliationName?.trim() || sepAffs[i] || undefined,
		});
	}
	return authors;
}

export function parseLlmResponse(response: string): ExtractionResult {
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

		const title = raw.title?.trim();
		if (title) result.title = title;

		if (raw.authors) {
			result.authors = mapAuthors(raw.authors, raw.emails, raw.affiliations);
		}

		if (raw.keywords) {
			result.keywords = raw.keywords.flatMap((k) =>
				k.trim() ? [k.trim()] : [],
			);
		}

		return result;
	} catch {
		return {};
	}
}
