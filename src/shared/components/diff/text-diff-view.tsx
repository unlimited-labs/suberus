import type { DiffSegment } from "@/shared/lib/text-diff";
import { cn } from "@/shared/lib/utils";
import { DiffDel, DiffIns } from "./diff-marks";

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
			className={cn(
				"whitespace-pre-wrap break-words text-sm leading-relaxed",
				className,
			)}
			data-testid="text-diff"
		>
			{segments.map((seg, i) => {
				if (seg.type === "equal") {
					return <span key={i}>{seg.value}</span>;
				}
				if (seg.type === "insert") {
					return <DiffIns key={i}>{seg.value}</DiffIns>;
				}
				return <DiffDel key={i}>{seg.value}</DiffDel>;
			})}
		</div>
	);
}
