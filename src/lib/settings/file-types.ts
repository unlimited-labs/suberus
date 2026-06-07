/**
 * Single source of truth for file extensions supported by submission/review
 * uploads. The set is bounded by what auto-extraction can actually parse
 * (see src/lib/server/workers/extraction.ts and use-document-extraction.ts).
 */

export const SUPPORTED_FILE_EXTENSIONS = ["pdf", "docx"] as const;

export type SupportedFileExtension = (typeof SUPPORTED_FILE_EXTENSIONS)[number];

/** Labelled options for settings UIs (checkbox lists). */
export const FILE_TYPE_OPTIONS = SUPPORTED_FILE_EXTENSIONS.map((value) => ({
	value,
	label: value.toUpperCase(),
}));

/** Comma-separated `accept` attribute for <input type="file">, e.g. ".pdf,.docx". */
export const FILE_ACCEPT_ATTRIBUTE = SUPPORTED_FILE_EXTENSIONS.map(
	(ext) => `.${ext}`,
).join(",");

/** Dot-prefixed extensions, e.g. [".pdf", ".docx"]. */
export const SUPPORTED_FILE_EXTENSIONS_DOTTED = SUPPORTED_FILE_EXTENSIONS.map(
	(ext) => `.${ext}`,
);
