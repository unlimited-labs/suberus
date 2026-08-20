// Isomorphic placeholder helpers for bulk-email campaigns. No server imports so
// this is unit-testable and safe to import from UI (e.g. the placeholder help).

/** Placeholders an admin may use in a campaign body/subject. */
export const PLACEHOLDER_KEYS = ["firstName", "lastName", "title"] as const;
export type PlaceholderKey = (typeof PLACEHOLDER_KEYS)[number];
export type PlaceholderValues = Record<PlaceholderKey, string>;

/** Per-recipient data snapshot taken when a campaign draft is created. */
export interface RecipientSnapshot {
	userId: string | null;
	email: string;
	firstName: string | null;
	lastName: string | null;
	/** Submission titles, comma-joined ({{title}}). Empty string when none. */
	titles: string;
}

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

/** Comma-joins non-empty titles; returns "" when the recipient has none. */
export function joinTitles(titles: Array<string | null | undefined>): string {
	return titles
		.map((t) => t?.trim())
		.filter((t): t is string => Boolean(t))
		.join(", ");
}

/** Maps a recipient snapshot to the substitution values for its placeholders. */
export function recipientValues(r: {
	firstName: string | null;
	lastName: string | null;
	titles: string;
}) {
	return {
		firstName: r.firstName ?? "",
		lastName: r.lastName ?? "",
		title: r.titles,
	};
}

/**
 * Substitutes `{{key}}` tokens in an already-rendered body. When `isHtml`, the
 * (admin- or user-controlled) value is HTML-escaped to prevent markup/link
 * injection — matching the transactional `sendEmail` path. Unknown tokens are
 * left untouched. Render-then-substitute keeps the snapshot reusable per
 * recipient and avoids re-rendering markdown/MJML for every send.
 */
export function applyPlaceholders(
	body: string,
	values: PlaceholderValues,
	isHtml: boolean,
): string {
	let out = body;
	for (const [key, value] of Object.entries(values)) {
		const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
		const replacement = isHtml ? escapeHtml(value) : value;
		// Function replacer avoids `$`-pattern interpretation in the value.
		out = out.replace(regex, () => replacement);
	}
	return out;
}

/** Picks a random element (or undefined when empty). `rng` injectable for tests. */
export function pickRandom<T>(
	items: readonly T[],
	rng: () => number = Math.random,
): T | undefined {
	if (items.length === 0) return undefined;
	return items[Math.floor(rng() * items.length)];
}

/** Fallback sample values for a "send to me" test when a campaign has no recipients. */
export const SAMPLE_VALUES = {
	firstName: "Ada",
	lastName: "Lovelace",
	title: "On the Analytical Engine",
} satisfies PlaceholderValues;
