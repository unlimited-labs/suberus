"use client";

import { useEffect, useState } from "react";
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
	const [html, setHtml] = useState<string>("");
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		let isMounted = true;

		renderMarkdown(content)
			.then((rendered) => {
				if (isMounted) {
					setHtml(rendered);
					setIsLoading(false);
				}
			})
			.catch((error) => {
				console.error("Failed to render markdown:", error);
				if (isMounted) {
					setHtml("<p>Failed to render content</p>");
					setIsLoading(false);
				}
			});

		return () => {
			isMounted = false;
		};
	}, [content]);

	if (isLoading) {
		return <div className="animate-pulse">Loading...</div>;
	}

	return (
		<div
			className={`prose prose-slate dark:prose-invert max-w-none prose-headings:font-semibold prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-pre:bg-slate-100 dark:prose-pre:bg-slate-800 ${className}`}
		>
			{parse(html)}
		</div>
	);
}
