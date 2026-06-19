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

/** Render every math span in a (sanitized) HTML fragment to static KaTeX markup. */
export function renderMathInHtml(html: string): string {
	return html.replace(MATH_SPAN_RE, (whole, kind, body) => {
		const tex = stripDelimiters(decodeEntities(body));
		try {
			return katex.renderToString(tex, {
				displayMode: kind === "display",
				throwOnError: false,
				strict: "ignore",
				trust: false,
				output: "htmlAndMathml",
			});
		} catch {
			return whole; // leave the original span if KaTeX can't render it
		}
	});
}
