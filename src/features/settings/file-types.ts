/**
 * Single source of truth for file extensions supported by submission/review
 * uploads. The set is bounded by what auto-extraction can actually parse
 * (see src/shared/server/workers/extraction.ts and use-document-extraction.ts).
 */

export const SUPPORTED_FILE_EXTENSIONS = ["pdf", "docx"] as const;

export type SupportedFileExtension = (typeof SUPPORTED_FILE_EXTENSIONS)[number];

/**
 * Image extensions accepted for branding/avatar uploads. Values are the
 * extensions `file-type` reports (e.g. JPEG is detected as "jpg").
 */
export const SUPPORTED_IMAGE_EXTENSIONS = ["jpg", "png", "webp"] as const;

/**
 * Extensions accepted as bulk-email campaign attachments. All binary formats
 * with a magic number (validated via `file-type`); text formats are excluded
 * because the signature validator can't recognize them.
 */
export const EMAIL_ATTACHMENT_EXTENSIONS = [
	"pdf",
	"docx",
	"xlsx",
	"pptx",
	"png",
	"jpg",
	"gif",
	"webp",
	"zip",
] as const;

/** Comma-separated `accept` attribute for the attachment <input type="file">. */
export const EMAIL_ATTACHMENT_ACCEPT_ATTRIBUTE =
	EMAIL_ATTACHMENT_EXTENSIONS.map((ext) => `.${ext}`).join(",");

/** Comma-separated `accept` attribute for <input type="file">, e.g. ".pdf,.docx". */
export const FILE_ACCEPT_ATTRIBUTE = SUPPORTED_FILE_EXTENSIONS.map(
	(ext) => `.${ext}`,
).join(",");

/** Dot-prefixed extensions, e.g. [".pdf", ".docx"]. */
export const SUPPORTED_FILE_EXTENSIONS_DOTTED = SUPPORTED_FILE_EXTENSIONS.map(
	(ext) => `.${ext}`,
);
