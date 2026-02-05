import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

/**
 * Renders Markdown content to HTML
 * @param content - Markdown string to render
 * @returns Promise resolving to HTML string
 */
export async function renderMarkdown(content: string): Promise<string> {
	const result = await unified()
		.use(remarkParse) // Parse markdown
		.use(remarkGfm) // GitHub Flavored Markdown support
		.use(remarkRehype) // Convert markdown to HTML AST
		.use(rehypeStringify) // Stringify HTML
		.process(content);

	return String(result);
}
