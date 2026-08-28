import filenamify from "filenamify";
import latinize from "latinize";

export function sanitizeFileName(originalName: string): string {
	return filenamify(latinize(originalName), { replacement: "_" });
}

/**
 * Header values are ByteStrings, so `filename` must be pure ASCII — latinize
 * only covers Latin diacritics. `filename*` (RFC 5987) carries the real name.
 */
export function contentDispositionAttachment(originalName: string): string {
	const ascii =
		sanitizeFileName(originalName).replace(/[^\x20-\x7E]/g, "_") || "download";
	const encoded = encodeURIComponent(originalName);
	return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

/**
 * Build the display name for a submission file from its authors:
 *   single author → Imie_Nazwisko.ext
 *   multiple      → Imie_Nazwisko_et_al.ext  (first author by orderIndex)
 * Diacritics are latinized; each name word is capitalized; ext preserved.
 */
export function generateAuthorFileName(
	authors: { firstName: string; lastName: string }[],
	extension: string,
): string {
	const part = (s: string) =>
		sanitizeFileName(
			latinize(s)
				.trim()
				.toLowerCase()
				.replace(/(^|[\s-])([a-z])/g, (_, sep, c) => sep + c.toUpperCase()),
		).replace(/\s+/g, "_");

	const first = authors[0];
	const base = `${part(first.firstName)}_${part(first.lastName)}`;
	const suffix = authors.length > 1 ? "_et_al" : "";
	const ext = extension ? `.${extension.replace(/^\./, "")}` : "";
	return `${base}${suffix}${ext}`;
}
