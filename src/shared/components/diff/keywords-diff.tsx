import type { ReactNode } from "react";
import { SplitColumns } from "@/shared/components/diff/split-columns";
import { diffList, type ListDiffStatus } from "@/shared/lib/list-diff";
import { cn } from "@/shared/lib/utils";

/** Side-by-side (`split`) vs unified (`inline`) diff rendering. */
export type DiffLayout = "split" | "inline";

/** Status label + row style for each diff status (text label, not colour-only, for WCAG 1.4.1). */
export const STATUS_STYLE = {
	added: { label: "added", row: "text-emerald-700 dark:text-emerald-300" },
	removed: {
		label: "removed",
		row: "text-red-700 line-through opacity-80 dark:text-red-300",
	},
	changed: { label: "changed", row: "text-amber-700 dark:text-amber-300" },
	unchanged: { label: "", row: "text-muted-foreground" },
} satisfies Record<ListDiffStatus, { label: string; row: string }>;

function KeywordPill({
	status,
	children,
}: {
	status: ListDiffStatus;
	children: ReactNode;
}) {
	const s = STATUS_STYLE[status];
	return (
		<li
			className={cn(
				"rounded-md border border-border px-2 py-0.5 text-sm",
				s.row,
			)}
			data-diff-status={status}
		>
			{children}
			{s.label && (
				<span className="ml-1 text-[10px] tracking-wide uppercase opacity-70">
					{s.label}
				</span>
			)}
		</li>
	);
}

/** Status of a single keyword within one version, relative to its counterpart. */
function keywordStatus(
	keyword: string,
	counterpart: Set<string>,
	missingStatus: "added" | "removed",
): ListDiffStatus {
	return counterpart.has(keyword) ? "unchanged" : missingStatus;
}

/**
 * Structural diff of two keyword (string) lists, keyed by value, rendered as
 * added / removed / changed pills. `inline` shows the unified list; `split`
 * reconstructs each version in its own column with per-column status styling.
 */
export function KeywordsDiff({
	base,
	compare,
	emptyLabel,
	layout,
	oldLabel,
	newLabel,
}: {
	base: string[];
	compare: string[];
	emptyLabel: string;
	layout: DiffLayout;
	oldLabel: string;
	newLabel: string;
}) {
	if (base.length === 0 && compare.length === 0) {
		return <p className="text-muted-foreground text-sm">{emptyLabel}</p>;
	}

	if (layout === "split") {
		const baseSet = new Set(base);
		const compareSet = new Set(compare);
		return (
			<SplitColumns
				newChildren={
					<ul className="flex flex-wrap gap-2" data-testid="keywords-diff">
						{compare.map((k) => (
							<KeywordPill key={k} status={keywordStatus(k, baseSet, "added")}>
								{k}
							</KeywordPill>
						))}
					</ul>
				}
				newLabel={newLabel}
				oldChildren={
					<ul className="flex flex-wrap gap-2" data-testid="keywords-diff">
						{base.map((k) => (
							<KeywordPill
								key={k}
								status={keywordStatus(k, compareSet, "removed")}
							>
								{k}
							</KeywordPill>
						))}
					</ul>
				}
				oldLabel={oldLabel}
			/>
		);
	}

	const entries = diffList(base, compare, (k) => k);
	return (
		<ul className="flex flex-wrap gap-2" data-testid="keywords-diff">
			{entries.map((e) => (
				<KeywordPill key={`${e.status}:${e.item}`} status={e.status}>
					{e.item}
				</KeywordPill>
			))}
		</ul>
	);
}
