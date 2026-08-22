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

export const EMAIL_ATTACHMENT_ACCEPT_ATTRIBUTE =
	EMAIL_ATTACHMENT_EXTENSIONS.map((ext) => `.${ext}`).join(",");

export const FILE_ACCEPT_ATTRIBUTE = SUPPORTED_FILE_EXTENSIONS.map(
	(ext) => `.${ext}`,
).join(",");

export const SUPPORTED_FILE_EXTENSIONS_DOTTED = SUPPORTED_FILE_EXTENSIONS.map(
	(ext) => `.${ext}`,
);
