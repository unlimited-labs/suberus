import type { DiffSegment } from "@/shared/lib/text-diff";
import { cn } from "@/shared/lib/utils";

interface TextDiffViewProps {
	segments: DiffSegment[];
	/** Rendered when there are no changes at all. */
	emptyLabel?: string;
	className?: string;
}

/**
 * Inline unified redline. Changes are encoded on a non-colour channel too
 * (underline for insertions, line-through for deletions) so the diff stays
 * legible for colourblind reviewers (WCAG 1.4.1), and each change is wrapped in
 * screen-reader-only boundary text because JAWS otherwise drops ins/del meaning.
 * Author text is rendered as React nodes (never dangerouslySetInnerHTML), so it
 * is inherently escaped — no sanitiser needed on this path.
 */
export function TextDiffView({
	segments,
	emptyLabel,
	className,
}: TextDiffViewProps) {
	const changed = segments.some((s) => s.type !== "equal");

	if (!changed && emptyLabel) {
		return (
			<p className="text-sm text-muted-foreground" data-testid="diff-unchanged">
				{emptyLabel}
			</p>
		);
	}

	return (
		<div
			data-testid="text-diff"
			className={cn(
				"whitespace-pre-wrap break-words text-sm leading-relaxed",
				className,
			)}
		>
			{segments.map((seg, i) => {
				if (seg.type === "equal") {
					return <span key={i}>{seg.value}</span>;
				}
				if (seg.type === "insert") {
					return (
						<ins
							key={i}
							data-testid="diff-ins"
							className="rounded-sm bg-emerald-500/15 text-emerald-700 underline decoration-emerald-600/70 decoration-2 dark:text-emerald-300"
						>
							<span className="sr-only"> inserted: </span>
							{seg.value}
							<span className="sr-only"> (end inserted) </span>
						</ins>
					);
				}
				return (
					<del
						key={i}
						data-testid="diff-del"
						className="rounded-sm bg-red-500/15 text-red-700 line-through dark:text-red-300"
					>
						<span className="sr-only"> deleted: </span>
						{seg.value}
						<span className="sr-only"> (end deleted) </span>
					</del>
				);
			})}
		</div>
	);
}
