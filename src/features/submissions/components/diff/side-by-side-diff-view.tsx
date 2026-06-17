import type { DiffSegment } from "@/shared/lib/text-diff";
import { cn } from "@/shared/lib/utils";

interface SideBySideDiffViewProps {
	segments: DiffSegment[];
	oldLabel: string;
	newLabel: string;
	className?: string;
}

/**
 * Two-panel split diff. The left panel reconstructs the old text (equal +
 * deletions struck through); the right panel reconstructs the new text (equal +
 * insertions underlined). Author text is rendered as React nodes, so it is
 * inherently escaped. Stacks to one column below `md` (side-by-side is unusable
 * on a phone), where the inline view is offered instead.
 */
export function SideBySideDiffView({
	segments,
	oldLabel,
	newLabel,
	className,
}: SideBySideDiffViewProps) {
	const oldSegments = segments.filter((s) => s.type !== "insert");
	const newSegments = segments.filter((s) => s.type !== "delete");

	return (
		<div
			data-testid="side-by-side-diff"
			className={cn("grid gap-4 md:grid-cols-2", className)}
		>
			<div data-testid="diff-side-old" className="space-y-2">
				<div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
					{oldLabel}
				</div>
				<div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
					{oldSegments.map((seg, i) =>
						seg.type === "delete" ? (
							<del
								key={i}
								data-testid="diff-del"
								className="rounded-sm bg-red-500/15 text-red-700 line-through dark:text-red-300"
							>
								<span className="sr-only"> deleted: </span>
								{seg.value}
								<span className="sr-only"> (end deleted) </span>
							</del>
						) : (
							<span key={i}>{seg.value}</span>
						),
					)}
				</div>
			</div>
			<div
				data-testid="diff-side-new"
				className="space-y-2 md:border-l md:pl-4"
			>
				<div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
					{newLabel}
				</div>
				<div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
					{newSegments.map((seg, i) =>
						seg.type === "insert" ? (
							<ins
								key={i}
								data-testid="diff-ins"
								className="rounded-sm bg-emerald-500/15 text-emerald-700 underline decoration-emerald-600/70 decoration-2 dark:text-emerald-300"
							>
								<span className="sr-only"> inserted: </span>
								{seg.value}
								<span className="sr-only"> (end inserted) </span>
							</ins>
						) : (
							<span key={i}>{seg.value}</span>
						),
					)}
				</div>
			</div>
		</div>
	);
}
