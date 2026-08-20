import createDOMPurify from "dompurify";
import { JSDOM } from "jsdom";

/**
 * Server-side HTML sanitizer for the version-diff render substrate.
 *
 * DOMPurify must be bound to a DOM. On the server there is no `window`, and an
 * unbound DOMPurify is `isSupported: false` and returns its input UNSANITISED
 * (gotcha C1, proven in the Phase 0 spike). We therefore bind it to a jsdom
 * window. The instance is created lazily so importing this module never
 * constructs a jsdom window at load time (keeps it out of the SSR import path).
 *
 * Why jsdom and not a lighter DOM (linkedom/happy-dom): DOMPurify only sanitizes
 * correctly against jsdom's complete DOM. linkedom lacks
 * `implementation.createHTMLDocument` + `NodeFilter` → `isSupported` is false and
 * it no-ops. happy-dom reports `isSupported: true` but silently lets `onerror`,
 * `object/embed`, `form/input` through (partial XSS bypass). Proven 2026-06-20.
 *
 * Authoritative gate: the redline is produced by the docx-api sidecar (xmldiff)
 * and is UNTRUSTED — run this over its output so a vector smuggled into
 * `<ins>`/`<del>` (or anywhere) is removed before persisting/rendering (C2). It is
 * also the gate for each normalized artifact before it is stored.
 */

type Purifier = ReturnType<typeof createDOMPurify>;

let purifier: Purifier | null = null;

function getPurifier(): Purifier {
	if (!purifier) {
		const { window } = new JSDOM("");
		// jsdom's window satisfies DOMPurify's WindowLike at runtime; the static
		// types don't overlap, so narrow to the factory's own parameter type.
		const p = createDOMPurify(
			// oxlint-disable-next-line anti-slop/no-chained-type-assertions
			window as unknown as Parameters<typeof createDOMPurify>[0],
		);
		// Fail loud, not silent: an unbound/incompatible DOMPurify returns input
		// UNSANITISED (C1). Never pass untrusted HTML through this XSS gate
		// unchanged — crash instead.
		if (!p.isSupported) {
			throw new Error(
				"sanitizeDiffHtml: DOMPurify is not supported on this DOM backend",
			);
		}
		purifier = p;
	}
	return purifier;
}

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

/** Sanitize untrusted normalized/redline HTML to the strict diff allowlist. */
export function sanitizeDiffHtml(html: string): string {
	return getPurifier().sanitize(html, CONFIG);
}
