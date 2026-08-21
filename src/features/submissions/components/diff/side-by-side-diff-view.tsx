import { DiffDel, DiffIns } from "@/shared/components/diff/diff-marks";
import { SplitColumns } from "@/shared/components/diff/split-columns";
import type { DiffSegment } from "@/shared/lib/text-diff";

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
		<SplitColumns
			className={className}
			newChildren={
				<div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
					{newSegments.map((seg, i) =>
						seg.type === "insert" ? (
							<DiffIns key={i}>{seg.value}</DiffIns>
						) : (
							<span key={i}>{seg.value}</span>
						),
					)}
				</div>
			}
			newLabel={newLabel}
			oldChildren={
				<div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
					{oldSegments.map((seg, i) =>
						seg.type === "delete" ? (
							<DiffDel key={i}>{seg.value}</DiffDel>
						) : (
							<span key={i}>{seg.value}</span>
						),
					)}
				</div>
			}
			oldLabel={oldLabel}
		/>
	);
}
