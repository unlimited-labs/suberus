import { IconExternalLink } from "@tabler/icons-react";
import parse from "html-react-parser";
import { renderMarkdown } from "@/shared/lib/markdown";

interface MarkdownProps {
	content: string;
	className?: string;
}

export function Markdown({ content, className = "" }: MarkdownProps) {
	return (
		<div
			className={`prose prose-sm prose-slate dark:prose-invert max-w-none prose-headings:font-semibold prose-a:text-primary prose-pre:bg-muted ${className}`}
		>
			{parse(renderMarkdown(content))}
		</div>
	);
}

export function MarkdownHint({ className = "" }: { className?: string }) {
	return (
		<p
			className={`flex items-center gap-1 text-xs text-muted-foreground ${className}`}
		>
			Supports Markdown formatting
			<a
				href="https://www.markdownguide.org/basic-syntax/"
				target="_blank"
				rel="noopener noreferrer"
				title="Markdown syntax guide"
				aria-label="Markdown syntax guide"
				className="inline-flex hover:text-foreground"
			>
				<IconExternalLink className="size-3.5" />
			</a>
		</p>
	);
}
