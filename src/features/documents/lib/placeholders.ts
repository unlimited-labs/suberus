// Isomorphic placeholder registry for document templates. No server imports, so
// it's safe to import from UI (the admin placeholder help, the resolution preview)
// and unit-testable. The token syntax is single-brace `{key}` — easy-template-x's
// default delimiter — matching what admins type in their .docx.

export const DOCUMENT_PLACEHOLDERS = [
	{ key: "firstName", label: "First name" },
	{ key: "lastName", label: "Last name" },
	{ key: "affiliation", label: "Affiliation" },
	{ key: "abstractTitle", label: "Accepted abstract title(s)" },
	{ key: "email", label: "Email" },
	{ key: "date", label: "Today's date" },
] as const;

export type PlaceholderKey = (typeof DOCUMENT_PLACEHOLDERS)[number]["key"];

export const PLACEHOLDER_KEYS: readonly PlaceholderKey[] =
	DOCUMENT_PLACEHOLDERS.map((p) => p.key);

export function isPlaceholderKey(tag: string): tag is PlaceholderKey {
	// SAFETY: widening a const tuple only to test membership of an arbitrary string.
	return (PLACEHOLDER_KEYS as readonly string[]).includes(tag);
}

/** Labels keyed by placeholder, for UI tables/chips. */
export const PLACEHOLDER_LABELS = Object.fromEntries(
	DOCUMENT_PLACEHOLDERS.map((p) => [p.key, p.label]),
) satisfies Record<string, string>;

export interface ResolvedPlaceholders {
	/** Substitution values for every registry key (empty string when unresolved). */
	values: Record<PlaceholderKey, string>;
	/** Keys whose value could not be resolved (empty) — block generation on these. */
	missing: PlaceholderKey[];
}

export interface PlaceholderInput {
	firstName: string | null;
	lastName: string | null;
	email: string;
	affiliationName: string | null;
	/** Titles of the user's ACCEPTED submissions (any order). */
	acceptedTitles: string[];
	/** Already-formatted "today" string. */
	date: string;
}

/**
 * Pure mapping from resolved participant data to placeholder values + missing set.
 * A key is "missing" when its value is empty; `abstractTitle` joins accepted titles
 * with ", ". No server imports → unit-testable and UI-safe.
 */
export function computePlaceholders(
	input: PlaceholderInput,
): ResolvedPlaceholders {
	const values = {
		firstName: input.firstName?.trim() ?? "",
		lastName: input.lastName?.trim() ?? "",
		affiliation: input.affiliationName?.trim() ?? "",
		abstractTitle: input.acceptedTitles
			.flatMap((t) => t.trim() || [])
			.join(", "),
		email: input.email.trim(),
		date: input.date,
	} satisfies Record<PlaceholderKey, string>;

	const missing = PLACEHOLDER_KEYS.filter((key) => !values[key]);
	return { values, missing };
}
