import type { JsonValue } from "@/generated/prisma/internal/prismaNamespace.ts";
import { lookup } from "@/shared/lib/lookup";
import {
	BUILTIN_PLACEHOLDER_KEYS,
	extractTokens,
	parseDataColumns,
	parseRecipientData,
	type PlaceholderIssues,
	recipientValues,
	unknownTokens,
} from "@/shared/lib/placeholders";

export interface PlaceholderRecipient {
	email: string;
	firstName: string | null;
	lastName: string | null;
	titles: string;
	data: JsonValue;
}

const SAMPLE_LIMIT = 5;

/**
 * Which of `tokens` name nothing, and which name a column some recipient leaves
 * empty. `loadRecipients` runs only when at least one known token is in play.
 */
export async function collectPlaceholderIssues(
	dataColumns: JsonValue,
	tokens: string[],
	loadRecipients: () => Promise<PlaceholderRecipient[]>,
): Promise<PlaceholderIssues> {
	const known = [
		...BUILTIN_PLACEHOLDER_KEYS,
		...Object.keys(parseDataColumns(dataColumns)),
	];
	const knownSet = new Set(known);
	const unknown = unknownTokens(tokens, known);
	const used = tokens.filter((t) => knownSet.has(t));
	if (used.length === 0) return { unknown, missing: [] };

	const values = (await loadRecipients()).map((r) => ({
		email: r.email,
		values: recipientValues({ ...r, data: parseRecipientData(r.data) }),
	}));

	const missing = used.flatMap((key) => {
		const empty = values.filter((v) => !lookup(v.values, key));
		return empty.length === 0
			? []
			: [
					{
						key,
						count: empty.length,
						sample: empty.slice(0, SAMPLE_LIMIT).map((v) => v.email),
					},
				];
	});

	return { unknown, missing };
}

export async function assertKnownPlaceholders(
	loadIssues: (tokens: string[]) => Promise<PlaceholderIssues>,
	subject: string,
	bodySource: string,
): Promise<void> {
	const { unknown } = await loadIssues(
		extractTokens(`${subject}\n${bodySource}`),
	);
	if (unknown.length > 0) {
		throw new Response(
			`Unknown placeholders: ${unknown.map((t) => `{{${t}}}`).join(", ")}`,
			{ status: 400 },
		);
	}
}
