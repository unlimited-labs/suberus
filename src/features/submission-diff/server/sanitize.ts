import { sanitizeHtml } from "@/shared/server/sanitize-html";

/**
 * Authoritative gate: the redline is produced by the docx-api sidecar (xmldiff)
 * and is UNTRUSTED — run this over its output so a vector smuggled into
 * `<ins>`/`<del>` (or anywhere) is removed before persisting/rendering (C2). It is
 * also the gate for each normalized artifact before it is stored.
 */

/** Strict allowlist for the diff render substrate (frozen in the Phase 0 spike). */
const CONFIG = {
	ALLOWED_TAGS: [
		"p",
		"br",
		"hr",
		"h1",
		"h2",
		"h3",
		"h4",
		"h5",
		"h6",
		"ul",
		"ol",
		"li",
		"strong",
		"em",
		"b",
		"i",
		"u",
		"s",
		"sup",
		"sub",
		"code",
		"pre",
		"blockquote",
		"table",
		"thead",
		"tbody",
		"tr",
		"td",
		"th",
		"img",
		"span",
		"div",
		"a",
		"ins",
		"del",
	],
	ALLOWED_ATTR: [
		"class",
		"data-diff",
		"href",
		"src",
		"alt",
		"colspan",
		"rowspan",
		"dir",
		"title",
		"width",
		"height",
		// Ordered-list numbering style/start (e.g. pandoc's `<ol type="a">`) — safe
		// attributes; without them a lettered Word list renders as plain "1.".
		"type",
		"start",
	],
	// Diff-substrate URIs: allow ONLY fragments, root-relative, and scheme-less
	// RELATIVE paths (the content-addressed `figures/<sha>.png` refs). Any value
	// with a colon — `https:`/`mailto:`/`data:`/`javascript:` — is rejected. This
	// blocks an author embedding an EXTERNAL `<img src="https://tracker">` that
	// would phone home from the reviewer's browser and de-anonymize blind review
	// (C11). Figures are inlined as same-document `data:` URIs at read time, AFTER
	// this gate, so no colon-bearing URI ever needs to survive here.
	ALLOWED_URI_REGEXP: /^(?:[#/]|[^:]*$)/i,
	FORBID_TAGS: [
		"script",
		"style",
		"iframe",
		"object",
		"embed",
		"form",
		"input",
		"svg",
	],
	FORBID_ATTR: ["srcset"],
};

export function sanitizeDiffHtml(html: string): string {
	return sanitizeHtml(html, CONFIG);
}
