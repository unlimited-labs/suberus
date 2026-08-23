import type { ReactNode } from "react";
import { STATUS_STYLE } from "@/shared/components/diff/keywords-diff";
import { SplitColumns } from "@/shared/components/diff/split-columns";
import { diffList, type ListDiffStatus } from "@/shared/lib/list-diff";
import { cn } from "@/shared/lib/utils";
import type { CompareLayout } from "./version-compare";
import {
	authorLine,
	authorsEqual,
	type CompareAuthor,
} from "./version-compare-format";

/**
 * Structural authors diff: keyed by email, rendered as added / removed /
 * changed rows instead of a word-diffed text blob. The status label is text
 * (not colour-only) for WCAG 1.4.1; rows carry `data-diff-status` for tests.
 * Keyword diffing lives in the shared `KeywordsDiff`.
 *
 * Follows the Side-by-side / Inline toggle like the text fields: `inline` shows
 * the unified added/removed/changed list; `split` reconstructs each version in
 * its own column (base left, compare right) with per-column status styling.
 */

function Row({
	status,
	children,
}: {
	status: ListDiffStatus;
	children: ReactNode;
}) {
	const s = STATUS_STYLE[status];
	return (
		<li className={cn("text-sm", s.row)} data-diff-status={status}>
			<span className="wrap-break-word">{children}</span>
			{s.label && (
				<span className="ml-2 text-xs font-medium tracking-wide uppercase opacity-70">
					{s.label}
				</span>
			)}
		</li>
	);
}

function authorStatus(
	author: CompareAuthor,
	counterpart: CompareAuthor | undefined,
	missingStatus: "added" | "removed",
): ListDiffStatus {
	if (!counterpart) return missingStatus;
	return authorsEqual(author, counterpart) ? "unchanged" : "changed";
}

export function AuthorsDiff({
	base,
	compare,
	emptyLabel,
	layout,
	oldLabel,
	newLabel,
}: {
	base: CompareAuthor[];
	compare: CompareAuthor[];
	emptyLabel: string;
	layout: CompareLayout;
	oldLabel: string;
	newLabel: string;
}) {
	if (base.length === 0 && compare.length === 0) {
		return <p className="text-muted-foreground text-sm">{emptyLabel}</p>;
	}

	if (layout === "split") {
		const baseByEmail = new Map(base.map((a) => [a.email, a]));
		const compareByEmail = new Map(compare.map((a) => [a.email, a]));
		return (
			<SplitColumns
				newChildren={
					<ul className="space-y-1.5" data-testid="authors-diff">
						{compare.map((a) => (
							<Row
								key={a.email}
								status={authorStatus(a, baseByEmail.get(a.email), "added")}
							>
								{authorLine(a)}
							</Row>
						))}
					</ul>
				}
				newLabel={newLabel}
				oldChildren={
					<ul className="space-y-1.5" data-testid="authors-diff">
						{base.map((a) => (
							<Row
								key={a.email}
								status={authorStatus(a, compareByEmail.get(a.email), "removed")}
							>
								{authorLine(a)}
							</Row>
						))}
					</ul>
				}
				oldLabel={oldLabel}
			/>
		);
	}

	const entries = diffList(base, compare, (a) => a.email, authorsEqual);
	return (
		<ul className="space-y-1.5" data-testid="authors-diff">
			{entries.map((e) => (
				<Row key={`${e.status}:${e.item.email}`} status={e.status}>
					{authorLine(e.item)}
					{e.status === "changed" && e.previous && (
						<span className="text-muted-foreground ml-1 text-xs line-through">
							{authorLine(e.previous)}
						</span>
					)}
				</Row>
			))}
		</ul>
	);
}
