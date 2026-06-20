import type { ReactNode } from "react";

/**
 * Shared redline marks for character/word-level text diffs. Each change is
 * encoded on a non-colour channel (underline for insertions, line-through for
 * deletions) for colourblind legibility (WCAG 1.4.1) and wrapped in
 * screen-reader-only boundary text because JAWS otherwise drops ins/del meaning.
 * Used by both the inline (TextDiffView) and side-by-side diff renderers.
 */

export function DiffIns({ children }: { children: ReactNode }) {
	return (
		<ins
			data-testid="diff-ins"
			className="rounded-sm bg-emerald-500/15 text-emerald-700 underline decoration-emerald-600/70 decoration-2 dark:text-emerald-300"
		>
			<span className="sr-only"> inserted: </span>
			{children}
			<span className="sr-only"> (end inserted) </span>
		</ins>
	);
}

export function DiffDel({ children }: { children: ReactNode }) {
	return (
		<del
			data-testid="diff-del"
			className="rounded-sm bg-red-500/15 text-red-700 line-through dark:text-red-300"
		>
			<span className="sr-only"> deleted: </span>
			{children}
			<span className="sr-only"> (end deleted) </span>
		</del>
	);
}
