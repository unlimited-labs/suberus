import type { ReactNode } from "react";
import { diffList, type ListDiffStatus } from "@/shared/lib/list-diff";
import { cn } from "@/shared/lib/utils";
import type { CompareLayout } from "./version-compare";
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
 *
 * Follows the Side-by-side / Inline toggle like the text fields: `inline` shows
 * the unified added/removed/changed list; `split` reconstructs each version in
 * its own column (base left, compare right) with per-column status styling.
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
			data-diff-status={status}
			className={cn(
				"rounded-md border border-border px-2 py-0.5 text-sm",
				s.row,
			)}
		>
			{children}
			{s.label && (
				<span className="ml-1 text-[10px] uppercase tracking-wide opacity-70">
					{s.label}
				</span>
			)}
		</li>
	);
}

/**
 * Two-column container mirroring `SideBySideDiffView`: base on the left, compare
 * on the right, each carrying the `diff-side-old` / `diff-side-new` testids and
 * the shared `side-by-side-diff` container so the layout-toggle e2e assertions
 * stay valid across every field.
 */
function SplitColumns({
	oldLabel,
	newLabel,
	oldChildren,
	newChildren,
}: {
	oldLabel: string;
	newLabel: string;
	oldChildren: ReactNode;
	newChildren: ReactNode;
}) {
	return (
		<div data-testid="side-by-side-diff" className="grid gap-4 md:grid-cols-2">
			<div data-testid="diff-side-old" className="space-y-2">
				<div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
					{oldLabel}
				</div>
				{oldChildren}
			</div>
			<div
				data-testid="diff-side-new"
				className="space-y-2 md:border-l md:pl-4"
			>
				<div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
					{newLabel}
				</div>
				{newChildren}
			</div>
		</div>
	);
}

/** Status of a single author within one version, relative to its counterpart. */
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
		return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
	}

	if (layout === "split") {
		const baseByEmail = new Map(base.map((a) => [a.email, a]));
		const compareByEmail = new Map(compare.map((a) => [a.email, a]));
		return (
			<SplitColumns
				oldLabel={oldLabel}
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
						<span className="ml-1 text-xs text-muted-foreground line-through">
							{authorLine(e.previous)}
						</span>
					)}
				</Row>
			))}
		</ul>
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
	layout: CompareLayout;
	oldLabel: string;
	newLabel: string;
}) {
	if (base.length === 0 && compare.length === 0) {
		return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
	}

	if (layout === "split") {
		const baseSet = new Set(base);
		const compareSet = new Set(compare);
		return (
			<SplitColumns
				oldLabel={oldLabel}
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
				newChildren={
					<ul className="flex flex-wrap gap-2" data-testid="keywords-diff">
						{compare.map((k) => (
							<KeywordPill key={k} status={keywordStatus(k, baseSet, "added")}>
								{k}
							</KeywordPill>
						))}
					</ul>
				}
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
