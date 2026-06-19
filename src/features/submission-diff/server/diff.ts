import htmldiff from "node-htmldiff";
import { parseFragment, serialize } from "parse5";
import { sha256 } from "./normalize";
import { sanitizeDiffHtml } from "./sanitize";

/**
 * ETAP2 redline between two already-normalized + sanitized HTML fragments.
 *
 *   protect math -> htmldiff (word-level <ins>/<del>) -> restore math
 *   -> parse5 rebalance -> final DOMPurify (authoritative gate, C2)
 *
 * Math spans are replaced with atomic alphanumeric tokens so htmldiff treats an
 * equation as one indivisible unit (a one-character change marks the whole
 * equation changed, not a garbled half). The same token map is shared across
 * both sides so identical equations collapse to equal tokens (no spurious diff).
 */

const MATH_SPAN_RE = /<span class="math[^"]*">[\s\S]*?<\/span>/g;
const MATH_TOKEN_RE = /xeqx[0-9a-f]{64}x/g;

function protectMath(html: string, tokens: Map<string, string>): string {
	return html.replace(MATH_SPAN_RE, (span) => {
		const token = `xeqx${sha256(Buffer.from(span))}x`;
		tokens.set(token, span);
		return token;
	});
}

const WRAPPED_MATH_RE = /<(del|ins)\b([^>]*)>(xeqx[0-9a-f]{64}x)<\/\1>/g;

function restoreMath(html: string, tokens: Map<string, string>): string {
	// A token that htmldiff wrapped on its own in <del>/<ins> is a changed
	// equation: tag the wrapper `matheq` so the render substrate boxes the whole
	// formula instead of striking it through (which would mangle the KaTeX).
	const tagged = html.replace(
		WRAPPED_MATH_RE,
		(_m, tag, attrs, token) =>
			`<${tag} class="matheq"${attrs}>${tokens.get(token) ?? token}</${tag}>`,
	);
	// Remaining bare tokens: unchanged equations, or ones diffed alongside text.
	return tagged.replace(MATH_TOKEN_RE, (token) => tokens.get(token) ?? token);
}

/** Reparse through parse5 to force a balanced, well-formed tree. */
function rebalance(html: string): string {
	return serialize(parseFragment(html));
}

/** Build the sanitized redline HTML between two normalized HTML fragments. */
export function diffHtml(oldHtml: string, newHtml: string): string {
	const tokens = new Map<string, string>();
	const a = protectMath(oldHtml, tokens);
	const b = protectMath(newHtml, tokens);
	const restored = restoreMath(htmldiff(a, b), tokens);
	return sanitizeDiffHtml(rebalance(restored));
}

export interface DiffStats {
	insertions: number;
	deletions: number;
}

/** Count redline insertion/deletion runs (block-level <ins>/<del> wrappers). */
export function diffStats(redline: string): DiffStats {
	return {
		insertions: (redline.match(/<ins\b/g) ?? []).length,
		deletions: (redline.match(/<del\b/g) ?? []).length,
	};
}
