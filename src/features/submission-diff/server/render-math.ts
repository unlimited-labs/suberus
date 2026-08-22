import katex from "katex";

// Pandoc emits math as `<span class="math inline">\(…\)</span>` /
// `<span class="math display">$$…$$</span>`. We render each to static KaTeX
// markup at read time (the iframe is script-less, so this must be server-side).
const MATH_SPAN_RE =
	/<span class="math(?:\s+(inline|display))?[^"]*">([\s\S]*?)<\/span>/g;

const DELIMITERS: Array<[string, string]> = [
	["$$", "$$"],
	["\\[", "\\]"],
	["\\(", "\\)"],
	["$", "$"],
];

function stripDelimiters(tex: string): string {
	const t = tex.trim();
	for (const [open, close] of DELIMITERS) {
		if (
			t.length >= open.length + close.length &&
			t.startsWith(open) &&
			t.endsWith(close)
		) {
			return t.slice(open.length, t.length - close.length);
		}
	}
	return t;
}

const ENTITIES: Array<[RegExp, string]> = [
	[/&lt;/g, "<"],
	[/&gt;/g, ">"],
	[/&quot;/g, '"'],
	[/&#39;/g, "'"],
	[/&amp;/g, "&"],
];

/** Pandoc HTML-escapes the TeX body; KaTeX needs the raw source. */
function decodeEntities(s: string): string {
	let out = s;
	for (const [re, ch] of ENTITIES) out = out.replace(re, ch);
	return out;
}

const ESCAPE: Array<[RegExp, string]> = [
	[/&/g, "&amp;"],
	[/</g, "&lt;"],
	[/>/g, "&gt;"],
];

/**
 * Plain-text fallback for a span that ISN'T valid TeX — e.g. an inline run mis-tagged
 * as math whose body is actually HTML (`&nbsp;<em>ε̇</em>`). Better to show the bare
 * symbol than KaTeX's red error box. Decode entities, drop tags/nbsp, re-escape.
 */
function plainFallback(body: string): string {
	const text = decodeEntities(body)
		.replace(/&nbsp;/g, " ")
		.replace(/<[^>]*>/g, "")
		.trim();
	let out = text;
	for (const [re, ch] of ESCAPE) out = out.replace(re, ch);
	return out;
}

export function renderMathInHtml(html: string): string {
	return html.replace(MATH_SPAN_RE, (_whole, kind, body) => {
		const tex = stripDelimiters(decodeEntities(body));
		try {
			// throwOnError:true so a non-TeX body falls through to the plain-text
			// fallback instead of rendering KaTeX's red error markup into the document.
			return katex.renderToString(tex, {
				displayMode: kind === "display",
				throwOnError: true,
				strict: "ignore",
				trust: false,
				output: "htmlAndMathml",
			});
		} catch {
			return plainFallback(body);
		}
	});
}
