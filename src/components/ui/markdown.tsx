import parse from "html-react-parser";
import { renderMarkdown } from "@/utils/markdown";

interface MarkdownProps {
	content: string;
	className?: string;
}

/**
 * Renders Markdown content as HTML with Tailwind prose styling
 */
export function Markdown({ content, className = "" }: MarkdownProps) {
	return (
		<div
			className={`prose prose-slate dark:prose-invert max-w-none prose-headings:font-semibold prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-pre:bg-slate-100 dark:prose-pre:bg-slate-800 ${className}`}
		>
			{parse(renderMarkdown(content))}
		</div>
	);
}
