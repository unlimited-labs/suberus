import { marked } from "marked";

/**
 * Renders Markdown content to HTML
 * @param content - Markdown string to render
 * @returns HTML string
 */
export function renderMarkdown(content: string): string {
	return marked.parse(content, { async: false });
}
