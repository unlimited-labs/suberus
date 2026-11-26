import { Marked } from "marked";

// Any `&` or `:` outside a known scheme is refused: `&#106;avascript&#58;` decodes to a scheme in the attribute.
const SAFE_URL = /^(?:https?:|mailto:|tel:|[#/?.]|[^:&]*$)/i;

const marked = new Marked({
	async: false,
	breaks: true,
	// The lexer marks text after an opened <script>/<pre>/<code>/<kbd> as pre-escaped; with that tag stripped it would print raw.
	walkTokens(token) {
		if (token.type === "text") token.escaped = false;
	},
	renderer: {
		html: () => "",
		link(token) {
			return SAFE_URL.test(token.href)
				? false
				: this.parser.parseInline(token.tokens);
		},
		image: ({ href }) => (SAFE_URL.test(href) ? false : ""),
	},
});

export function renderMarkdown(content: string): string {
	return marked.parse(content, { async: false });
}
