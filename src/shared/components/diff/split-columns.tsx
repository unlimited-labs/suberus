import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

interface SplitColumnsProps {
	oldLabel: string;
	newLabel: string;
	oldChildren: ReactNode;
	newChildren: ReactNode;
	className?: string;
}

/**
 * Two-column split-diff shell: base on the left, compare on the right, each
 * carrying the `diff-side-old` / `diff-side-new` testids inside the shared
 * `side-by-side-diff` container so the layout-toggle e2e assertions stay valid
 * across every field. Stacks to one column below `md`. Shared by the text
 * (SideBySideDiffView) and metadata (AuthorsDiff/KeywordsDiff) renderers.
 */
export function SplitColumns({
	oldLabel,
	newLabel,
	oldChildren,
	newChildren,
	className,
}: SplitColumnsProps) {
	return (
		<div
			className={cn("grid gap-4 md:grid-cols-2", className)}
			data-testid="side-by-side-diff"
		>
			<div className="space-y-2" data-testid="diff-side-old">
				<div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
					{oldLabel}
				</div>
				{oldChildren}
			</div>
			<div
				className="space-y-2 md:border-l md:pl-4"
				data-testid="diff-side-new"
			>
				<div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
					{newLabel}
				</div>
				{newChildren}
			</div>
		</div>
	);
}
