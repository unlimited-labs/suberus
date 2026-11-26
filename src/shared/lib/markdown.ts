import { Marked } from "marked";

// A leading `&` is rejected too: `&#106;avascript:` decodes to a scheme in the attribute.
const SAFE_URL = /^(?:https?:|mailto:|tel:|[#/?.])/i;

const marked = new Marked({
	async: false,
	breaks: true,
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
