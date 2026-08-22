export const PLACEHOLDER_KEYS = ["firstName", "lastName", "title"] as const;
export type PlaceholderKey = (typeof PLACEHOLDER_KEYS)[number];
export type PlaceholderValues = Record<PlaceholderKey, string>;

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
}) {
	return {
		firstName: r.firstName ?? "",
		lastName: r.lastName ?? "",
		title: r.titles,
	};
}

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
