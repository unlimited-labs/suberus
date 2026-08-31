import { useEffect, useRef, useState } from "react";
import type * as React from "react";
import { useShikiHighlighter } from "react-shiki/core";
import {
	type AppHighlighter,
	type CodeLang,
	getCodeHighlighter,
} from "@/shared/lib/code-highlighter";
import { APP_CODE_THEME } from "@/shared/lib/code-theme";
import { cn } from "@/shared/lib/utils";
import { Textarea } from "@/shared/ui/textarea";

interface CodeAreaProps extends React.ComponentProps<"textarea"> {
	lang?: CodeLang;
	value: string;
}

export function CodeArea({ className, lang, value, ...props }: CodeAreaProps) {
	const { disabled } = props;
	const highlighter = useCodeHighlighter();
	const overlayRef = useRef<HTMLDivElement>(null);

	const highlighted = Boolean(lang && highlighter);

	return (
		<div
			className={cn(
				"relative isolate rounded-lg",
				highlighted && disabled && "bg-input/50 dark:bg-input/80",
			)}
		>
			{lang && highlighter && (
				<HighlightOverlay
					className={cn(disabled && "opacity-50", className)}
					code={value}
					highlighter={highlighter}
					lang={lang}
					ref={overlayRef}
				/>
			)}
			<Textarea
				className={cn(
					highlighted &&
						"caret-foreground selection:bg-primary/30 relative bg-transparent text-transparent [scrollbar-gutter:stable] disabled:bg-transparent dark:bg-transparent dark:disabled:bg-transparent",
					className,
				)}
				onScroll={(e) => {
					const overlay = overlayRef.current;
					if (!overlay) return;
					overlay.scrollTop = e.currentTarget.scrollTop;
					overlay.scrollLeft = e.currentTarget.scrollLeft;
				}}
				value={value}
				{...props}
			/>
		</div>
	);
}

function keepPlainTextarea() {
	return undefined;
}

function useCodeHighlighter() {
	const [highlighter, setHighlighter] = useState<AppHighlighter>();
	useEffect(() => {
		let active = true;
		getCodeHighlighter().then((h) => {
			if (active) setHighlighter(h);
		}, keepPlainTextarea);
		return () => {
			active = false;
		};
	}, []);
	return highlighter;
}

interface HighlightOverlayProps {
	className?: string;
	code: string;
	highlighter: AppHighlighter;
	lang: CodeLang;
	ref: React.Ref<HTMLDivElement>;
}

function HighlightOverlay({
	className,
	code,
	highlighter,
	lang,
	ref,
}: HighlightOverlayProps) {
	const codeSizedToTextareaScroll = `${code}\n`;
	const nodes = useShikiHighlighter(codeSizedToTextareaScroll, lang, APP_CODE_THEME, {
		delay: 120,
		highlighter,
	});

	return (
		<div
			aria-hidden
			className={cn(
				"absolute inset-0 overflow-x-hidden overflow-y-scroll rounded-lg border border-transparent px-2.5 py-2 text-base [scrollbar-color:transparent_transparent] md:text-sm",
				"[&>pre]:m-0 [&>pre]:bg-transparent [&>pre]:font-[inherit] [&>pre]:text-[inherit] [&>pre]:leading-[inherit] [&>pre]:break-words [&>pre]:whitespace-pre-wrap",
				className,
			)}
			inert
			ref={ref}
		>
			{nodes}
		</div>
	);
}
