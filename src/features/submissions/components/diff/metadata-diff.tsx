import type { ReactNode } from "react";
import { diffList, type ListDiffStatus } from "@/shared/lib/list-diff";
import { cn } from "@/shared/lib/utils";
import {
	authorLine,
	authorsEqual,
	type CompareAuthor,
} from "./version-compare-format";

/**
 * Structural metadata diff: authors (keyed by email) and keywords (keyed by
 * value) rendered as added / removed / changed rows, instead of a word-diffed
 * text blob. The status label is text (not colour-only) for WCAG 1.4.1; rows
 * carry `data-diff-status` for tests.
 */

const STATUS_STYLE: Record<ListDiffStatus, { label: string; row: string }> = {
	added: { label: "added", row: "text-emerald-700 dark:text-emerald-300" },
	removed: {
		label: "removed",
		row: "text-red-700 line-through opacity-80 dark:text-red-300",
	},
	changed: { label: "changed", row: "text-amber-700 dark:text-amber-300" },
	unchanged: { label: "", row: "text-muted-foreground" },
};

function Row({
	status,
	children,
}: {
	status: ListDiffStatus;
	children: ReactNode;
}) {
	const s = STATUS_STYLE[status];
	return (
		<li
			className={cn("flex items-baseline gap-2 text-sm", s.row)}
			data-diff-status={status}
		>
			<span className="w-16 shrink-0 text-xs font-medium uppercase tracking-wide opacity-80">
				{s.label}
			</span>
			<span className="break-words">{children}</span>
		</li>
	);
}

export function AuthorsDiff({
	base,
	compare,
	emptyLabel,
}: {
	base: CompareAuthor[];
	compare: CompareAuthor[];
	emptyLabel: string;
}) {
	const entries = diffList(base, compare, (a) => a.email, authorsEqual);
	if (entries.length === 0) {
		return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
	}
	return (
		<ul className="space-y-1.5" data-testid="authors-diff">
			{entries.map((e) => (
				<Row key={`${e.status}:${e.item.email}`} status={e.status}>
					{authorLine(e.item)}
					{e.status === "changed" && e.previous && (
						<span className="ml-1 text-xs text-muted-foreground line-through">
							{authorLine(e.previous)}
						</span>
					)}
				</Row>
			))}
		</ul>
	);
}

export function KeywordsDiff({
	base,
	compare,
	emptyLabel,
}: {
	base: string[];
	compare: string[];
	emptyLabel: string;
}) {
	const entries = diffList(base, compare, (k) => k);
	if (entries.length === 0) {
		return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
	}
	return (
		<ul className="flex flex-wrap gap-2" data-testid="keywords-diff">
			{entries.map((e) => {
				const s = STATUS_STYLE[e.status];
				return (
					<li
						key={`${e.status}:${e.item}`}
						data-diff-status={e.status}
						className={cn(
							"rounded-md border border-border px-2 py-0.5 text-sm",
							s.row,
						)}
					>
						{e.item}
						{s.label && (
							<span className="ml-1 text-[10px] uppercase tracking-wide opacity-70">
								{s.label}
							</span>
						)}
					</li>
				);
			})}
		</ul>
	);
}
