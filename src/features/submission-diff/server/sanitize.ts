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
 * Authoritative final gate: run this AFTER htmldiff + math-restore + parse5
 * rebalance, so a vector smuggled into `<ins>`/`<del>` is still removed (C2).
 */

type Purifier = ReturnType<typeof createDOMPurify>;

let purifier: Purifier | null = null;

function getPurifier(): Purifier {
	if (!purifier) {
		const { window } = new JSDOM("");
		// jsdom's window satisfies DOMPurify's WindowLike at runtime; the static
		// types don't overlap, so narrow to the factory's own parameter type.
		purifier = createDOMPurify(
			window as unknown as Parameters<typeof createDOMPurify>[0],
		);
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
	],
	// Allow http(s)/mailto, fragments, root-relative, and scheme-less RELATIVE
	// paths (e.g. the content-addressed `figures/<sha>.png` refs). The final
	// `[^:]*$` alternative matches any value with no colon → relative paths pass
	// while `javascript:`/`data:` (which contain a colon) are rejected.
	ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[#/]|[^:]*$)/i,
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
