import { z } from "zod";
import type { JsonValue } from "@/generated/prisma/internal/prismaNamespace.ts";
import { lookup } from "@/shared/lib/lookup";

export const BUILTIN_PLACEHOLDER_KEYS = [
	"firstName",
	"lastName",
	"title",
] as const;
export type BuiltinPlaceholderKey = (typeof BUILTIN_PLACEHOLDER_KEYS)[number];

export const PLACEHOLDER_KEY_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

export type PlaceholderValues = Record<string, string>;

export const recipientDataSchema = z.record(
	z.string().regex(PLACEHOLDER_KEY_RE),
	z.string(),
);

/** Placeholder key -> the spreadsheet heading it came from. */
export function parseDataColumns(
	value: JsonValue | undefined,
): Record<string, string> {
	return recipientDataSchema.parse(value ?? {});
}

/** The only way a recipient's `data` Json leaves Prisma. */
export function parseRecipientData(
	value: JsonValue | undefined,
): Record<string, string> {
	return recipientDataSchema.parse(value ?? {});
}

export interface RecipientSnapshot {
	userId: string | null;
	email: string;
	firstName: string | null;
	lastName: string | null;
	/** Submission titles, comma-joined ({{title}}). Empty string when none. */
	titles: string;
	data: Record<string, string>;
}

export function escapeHtml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

export function joinTitles(titles: Array<string | null | undefined>): string {
	return titles
		.map((t) => t?.trim())
		.filter((t): t is string => Boolean(t))
		.join(", ");
}

export function recipientValues(r: {
	firstName: string | null;
	lastName: string | null;
	titles: string;
	data?: Record<string, string>;
}) {
	return {
		...r.data,
		firstName: r.firstName ?? "",
		lastName: r.lastName ?? "",
		title: r.titles,
	};
}

const TOKEN_RE = /\{\{([A-Za-z_][A-Za-z0-9_]*)\}\}/g;

export function extractTokens(text: string): string[] {
	return [...new Set(Array.from(text.matchAll(TOKEN_RE), (m) => m[1]))];
}

export function unknownTokens(
	tokens: readonly string[],
	knownKeys: readonly string[],
): string[] {
	const known = new Set(knownKeys);
	return tokens.filter((t) => !known.has(t));
}

export function applyPlaceholders(
	body: string,
	values: PlaceholderValues,
	isHtml: boolean,
): string {
	return body.replace(TOKEN_RE, (match, key: string) => {
		const value = lookup(values, key);
		if (value === undefined) return match;
		return isHtml ? escapeHtml(value) : value;
	});
}

export function suggestPlaceholderKey(header: string): string {
	const words = header
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.split(/[^A-Za-z0-9]+/)
		.filter(Boolean);
	const key = words
		.map((w, i) =>
			i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase(),
		)
		.join("");
	return PLACEHOLDER_KEY_RE.test(key) ? key : `column${key}`;
}

export function pickRandom<T>(
	items: readonly T[],
	rng: () => number = Math.random,
): T | undefined {
	if (items.length === 0) return undefined;
	return items[Math.floor(rng() * items.length)];
}

export const SAMPLE_VALUES = {
	firstName: "Ada",
	lastName: "Lovelace",
	title: "On the Analytical Engine",
} satisfies PlaceholderValues;

export interface PlaceholderIssues {
	unknown: string[];
	missing: Array<{ key: string; count: number; sample: string[] }>;
}
