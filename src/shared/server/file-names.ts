import filenamify from "filenamify";
import latinize from "latinize";

export function sanitizeFileName(originalName: string): string {
	return filenamify(latinize(originalName), { replacement: "_" });
}

/**
 * Header values are ByteStrings, so `filename` must be pure ASCII — latinize
 * only covers Latin diacritics. `filename*` (RFC 5987) carries the real name;
 * encodeURIComponent leaves five characters that RFC 5987 attr-char forbids.
 */
export function contentDisposition(
	disposition: "attachment" | "inline",
	originalName: string,
): string {
	const name = originalName.trim() || "download";
	const ascii = sanitizeFileName(name).replace(/[^\x20-\x7E]/g, "_");
	const encoded = encodeURIComponent(name).replace(
		/['()*!]/g,
		(c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
	);
	return `${disposition}; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

export const contentDispositionAttachment = (originalName: string) =>
	contentDisposition("attachment", originalName);

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
