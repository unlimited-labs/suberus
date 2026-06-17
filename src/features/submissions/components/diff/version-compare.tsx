import {
	IconColumns,
	IconFile,
	IconGitCompare,
	IconLayoutRows,
} from "@tabler/icons-react";
import { useMemo } from "react";
import type { EditorVersion } from "@/features/submissions/components/admin/detail/availability";
import { TextDiffView } from "@/shared/components/diff/text-diff-view";
import { useDateFormat } from "@/shared/hooks/use-date-format";
import {
	type DiffSegment,
	diffStats,
	diffText,
	fileChanged,
} from "@/shared/lib/text-diff";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { SideBySideDiffView } from "./side-by-side-diff-view";
import { VersionCompareSelector } from "./version-compare-selector";

export type CompareLayout = "split" | "inline";

/** Default pair: previous → current (falls back to oldest → current). */
export function defaultComparePair(
	versions: Array<{ version: number }>,
	current: number,
): { base: number; compare: number } {
	const below = versions
		.map((v) => v.version)
		.filter((n) => n < current)
		.sort((a, b) => b - a);
	const oldest = Math.min(...versions.map((v) => v.version));
	return { base: below[0] ?? oldest, compare: current };
}

const fileIdOf = (v: EditorVersion) => v.file?.id ?? null;
const fileNameOf = (v: EditorVersion) => v.file?.originalName ?? "no file";

function LayoutToggle({
	layout,
	onLayoutChange,
}: {
	layout: CompareLayout;
	onLayoutChange: (layout: CompareLayout) => void;
}) {
	return (
		<div className="hidden gap-1 md:flex">
			<Button
				type="button"
				size="sm"
				variant={layout === "split" ? "default" : "outline"}
				onClick={() => onLayoutChange("split")}
				data-testid="diff-layout-split"
			>
				<IconColumns className="size-4" />
				Side-by-side
			</Button>
			<Button
				type="button"
				size="sm"
				variant={layout === "inline" ? "default" : "outline"}
				onClick={() => onLayoutChange("inline")}
				data-testid="diff-layout-inline"
			>
				<IconLayoutRows className="size-4" />
				Inline
			</Button>
		</div>
	);
}

function ComparingHeader({
	baseLabel,
	compareLabel,
	insertions,
	deletions,
	samePair,
	isFileChanged,
}: {
	baseLabel: string;
	compareLabel: string;
	insertions: number;
	deletions: number;
	samePair: boolean;
	isFileChanged: boolean;
}) {
	return (
		<div
			className="sticky top-0 z-10 flex flex-wrap items-center gap-x-2 gap-y-1 border-b bg-background/95 py-2 text-sm backdrop-blur"
			data-testid="diff-comparing-header"
			aria-live="polite"
		>
			<IconGitCompare className="size-4 text-muted-foreground" />
			<span className="font-medium">
				Comparing {baseLabel} → {compareLabel}
			</span>
			{!samePair && (
				<span className="text-muted-foreground">
					<span className="text-emerald-600 dark:text-emerald-400">
						+{insertions}
					</span>{" "}
					<span className="text-red-600 dark:text-red-400">−{deletions}</span>{" "}
					chars in content
				</span>
			)}
			<Badge
				variant={isFileChanged ? "default" : "secondary"}
				className="ml-auto"
			>
				{isFileChanged ? "File changed" : "File unchanged"}
			</Badge>
		</div>
	);
}

function FileComparison({
	baseLabel,
	compareLabel,
	baseName,
	compareName,
	isFileChanged,
}: {
	baseLabel: string;
	compareLabel: string;
	baseName: string;
	compareName: string;
	isFileChanged: boolean;
}) {
	return (
		<section className="space-y-1 text-sm">
			<h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
				Attached file
			</h3>
			<div className="flex items-center gap-2 text-muted-foreground">
				<IconFile className="size-4 shrink-0" />
				<span className="truncate">
					{baseLabel}: {baseName}
				</span>
			</div>
			<div className="flex items-center gap-2 text-muted-foreground">
				<IconFile className="size-4 shrink-0" />
				<span className="truncate">
					{compareLabel}: {compareName}
				</span>
			</div>
			{isFileChanged && (
				<p className="text-xs text-muted-foreground/80">
					An inline redline of the file contents is coming in a later iteration;
					the originals can be downloaded from the Content tab.
				</p>
			)}
		</section>
	);
}

function ContentDiff({
	layout,
	segments,
	baseLabel,
	compareLabel,
}: {
	layout: CompareLayout;
	segments: DiffSegment[];
	baseLabel: string;
	compareLabel: string;
}) {
	if (layout === "split") {
		return (
			<SideBySideDiffView
				segments={segments}
				oldLabel={baseLabel}
				newLabel={compareLabel}
			/>
		);
	}
	return <TextDiffView segments={segments} emptyLabel="Content unchanged." />;
}

function Section({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<section className="space-y-1">
			<h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
				{title}
			</h3>
			{children}
		</section>
	);
}

function VersionCompareBody({
	baseV,
	compareV,
	base,
	compare,
	layout,
}: {
	baseV: EditorVersion;
	compareV: EditorVersion;
	base: number;
	compare: number;
	layout: CompareLayout;
}) {
	const { formatDate } = useDateFormat();
	const titleSegments = useMemo(
		() => diffText(baseV.title, compareV.title),
		[baseV.title, compareV.title],
	);
	const contentSegments = useMemo(
		() => diffText(baseV.content, compareV.content),
		[baseV.content, compareV.content],
	);

	const stats = diffStats(contentSegments);
	const isFileChanged = fileChanged(fileIdOf(baseV), fileIdOf(compareV));
	const samePair = base === compare;
	const baseLabel = `v${base} (${formatDate(baseV.createdAt)})`;
	const compareLabel = `v${compare} (${formatDate(compareV.createdAt)})`;

	return (
		<div className="space-y-5">
			<ComparingHeader
				baseLabel={baseLabel}
				compareLabel={compareLabel}
				insertions={stats.insertions}
				deletions={stats.deletions}
				samePair={samePair}
				isFileChanged={isFileChanged}
			/>
			{samePair && (
				<p className="text-sm text-muted-foreground">
					Select two different versions to see a diff.
				</p>
			)}
			<Section title="Title">
				<TextDiffView segments={titleSegments} emptyLabel="Title unchanged." />
			</Section>
			<FileComparison
				baseLabel={baseLabel}
				compareLabel={compareLabel}
				baseName={fileNameOf(baseV)}
				compareName={fileNameOf(compareV)}
				isFileChanged={isFileChanged}
			/>
			{compareV.comment && (
				<Section title={`Author's note for v${compare}`}>
					<p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
						{compareV.comment}
					</p>
				</Section>
			)}
			<Section title="Content">
				<ContentDiff
					layout={layout}
					segments={contentSegments}
					baseLabel={baseLabel}
					compareLabel={compareLabel}
				/>
			</Section>
		</div>
	);
}

interface VersionCompareProps {
	versions: EditorVersion[];
	currentVersionNumber: number;
	base: number;
	compare: number;
	layout: CompareLayout;
	onBaseChange: (version: number) => void;
	onCompareChange: (version: number) => void;
	onLayoutChange: (layout: CompareLayout) => void;
}

export function VersionCompare({
	versions,
	currentVersionNumber,
	base,
	compare,
	layout,
	onBaseChange,
	onCompareChange,
	onLayoutChange,
}: VersionCompareProps) {
	const sorted = useMemo(
		() => [...versions].sort((a, b) => a.version - b.version),
		[versions],
	);
	const baseV = sorted.find((v) => v.version === base);
	const compareV = sorted.find((v) => v.version === compare);

	if (sorted.length < 2 || !baseV || !compareV) {
		return (
			<p className="text-sm text-muted-foreground">
				This submission has only one version — nothing to compare yet.
			</p>
		);
	}

	return (
		<div className="space-y-5">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
				<div className="sm:max-w-md sm:flex-1">
					<VersionCompareSelector
						versions={sorted}
						currentVersion={currentVersionNumber}
						base={base}
						compare={compare}
						onBaseChange={onBaseChange}
						onCompareChange={onCompareChange}
					/>
				</div>
				<LayoutToggle layout={layout} onLayoutChange={onLayoutChange} />
			</div>
			<VersionCompareBody
				baseV={baseV}
				compareV={compareV}
				base={base}
				compare={compare}
				layout={layout}
			/>
		</div>
	);
}
