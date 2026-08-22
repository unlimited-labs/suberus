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

export const PLACEHOLDER_LABELS = Object.fromEntries(
	DOCUMENT_PLACEHOLDERS.map((p) => [p.key, p.label]),
) satisfies Record<string, string>;

export interface ResolvedPlaceholders {
	values: Record<PlaceholderKey, string>;
	missing: PlaceholderKey[];
}

export interface PlaceholderInput {
	firstName: string | null;
	lastName: string | null;
	email: string;
	affiliationName: string | null;
	acceptedTitles: string[];
	date: string;
}

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
