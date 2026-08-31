import createDOMPurify, { type Config } from "dompurify";
import { JSDOM } from "jsdom";

/**
 * DOMPurify must be bound to a DOM. On the server there is no `window`, and an
 * unbound DOMPurify is `isSupported: false` and returns its input UNSANITISED
 * (gotcha C1, proven in the submission-diff Phase 0 spike). We therefore bind it
 * to a jsdom window, lazily so importing this module never constructs a jsdom
 * window at load time (keeps it out of the SSR import path).
 *
 * Why jsdom and not a lighter DOM (linkedom/happy-dom): DOMPurify only sanitizes
 * correctly against jsdom's complete DOM. linkedom lacks
 * `implementation.createHTMLDocument` + `NodeFilter` → `isSupported` is false and
 * it no-ops. happy-dom reports `isSupported: true` but silently lets `onerror`,
 * `object/embed`, `form/input` through (partial XSS bypass). Proven 2026-06-20.
 */

export type Purifier = ReturnType<typeof createDOMPurify>;

/**
 * Builds a fresh DOM-bound DOMPurify instance. Most callers want the cached
 * singleton below (`sanitizeHtml`); use this directly only when you need a
 * dedicated instance to register purifier-scoped hooks (`addHook`), since
 * hooks are global to a purifier instance and would otherwise leak across
 * every feature sharing the cached one.
 */
export function createDomPurifier(): Purifier {
	const { window } = new JSDOM("");
	const p = createDOMPurify(
		// SAFETY: jsdom's window satisfies DOMPurify's WindowLike at runtime; the
		// static types don't overlap, so narrow to the factory's own parameter type.
		// oxlint-disable-next-line anti-slop/no-chained-type-assertions
		window as unknown as Parameters<typeof createDOMPurify>[0],
	);
	// Fail loud, not silent: an unbound/incompatible DOMPurify returns input
	// UNSANITISED (C1). Never pass untrusted HTML through this XSS gate
	// unchanged — crash instead.
	if (!p.isSupported) {
		throw new Error(
			"sanitizeHtml: DOMPurify is not supported on this DOM backend",
		);
	}
	return p;
}

let purifier: Purifier | null = null;

export function sanitizeHtml(html: string, config: Config): string {
	if (!purifier) purifier = createDomPurifier();
	return purifier.sanitize(html, config);
}
