import {
	IconColumns,
	IconDownload,
	IconFile,
	IconLayoutRows,
} from "@tabler/icons-react";
import { useMemo } from "react";
import { FileRedlineView } from "@/features/submission-diff/components/file-redline-view";
import { KeywordsDiff } from "@/shared/components/diff/keywords-diff";
import { TextDiffView } from "@/shared/components/diff/text-diff-view";
import { useDateFormat } from "@/shared/hooks/use-date-format";
import { diffList, listChanged } from "@/shared/lib/list-diff";
import {
	type DiffSegment,
	diffText,
	fileChanged,
} from "@/shared/lib/text-diff";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";
import { SectionCard } from "@/shared/ui/section-card";
import { AuthorsDiff } from "./metadata-diff";
import { SideBySideDiffView } from "./side-by-side-diff-view";
import { authorsEqual, type CompareAuthor } from "./version-compare-format";
import { VersionCompareSelector } from "./version-compare-selector";

export type CompareLayout = "split" | "inline";

/**
 * The version shape the comparison renders. Authors/keywords are optional so
 * blind-review callers (which must not leak author identities) can omit them;
 * they only render when `showMetadata` is set.
 */
export interface CompareVersion {
	id: string;
	version: number;
	title: string;
	content: string;
	comment: string | null;
	createdAt: Date;
	file: {
		id: string;
		fileName: string;
		originalName: string;
		mimeType: string;
		size: number;
	} | null;
	authors?: CompareAuthor[];
	keywords?: string[];
}

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

const fileIdOf = (v: CompareVersion) => v.file?.id ?? null;
const fileNameOf = (v: CompareVersion) => v.file?.originalName ?? "no file";

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

function FileRow({
	label,
	name,
	fileId,
	testId,
}: {
	label: string;
	name: string;
	fileId?: string;
	testId: string;
}) {
	return (
		<div className="flex items-center gap-2 text-muted-foreground">
			<IconFile className="size-4 shrink-0" />
			<span className="truncate">
				{label}: {name}
			</span>
			{fileId && (
				<Button variant="outline" size="sm" className="ml-auto gap-2" asChild>
					<a href={`/api/files/${fileId}`} data-testid={testId}>
						<IconDownload className="size-4" />
						Download
					</a>
				</Button>
			)}
		</div>
	);
}

function FileRows({
	baseLabel,
	compareLabel,
	baseName,
	compareName,
	baseFileId,
	compareFileId,
	isFileChanged,
}: {
	baseLabel: string;
	compareLabel: string;
	baseName: string;
	compareName: string;
	baseFileId?: string;
	compareFileId?: string;
	isFileChanged: boolean;
}) {
	return (
		<div className="space-y-2 text-sm">
			<FileRow
				label={baseLabel}
				name={baseName}
				fileId={baseFileId}
				testId="compare-download-base"
			/>
			<FileRow
				label={compareLabel}
				name={compareName}
				fileId={compareFileId}
				testId="compare-download-compare"
			/>
			{isFileChanged && (
				<p className="text-xs text-muted-foreground/80">
					See the inline redline of the file contents below.
				</p>
			)}
		</div>
	);
}

/**
 * One field's diff, sharing the File-contents model: it always shows the text
 * (not a muted "unchanged" note) and highlights any change, and it follows the
 * Side-by-side / Inline toggle — split reconstructs old vs new in two columns,
 * inline shows the unified redline. `emptyLabel` is used only when the field is
 * genuinely empty on both versions.
 */
function FieldDiff({
	layout,
	segments,
	baseLabel,
	compareLabel,
	emptyLabel,
}: {
	layout: CompareLayout;
	segments: DiffSegment[];
	baseLabel: string;
	compareLabel: string;
	emptyLabel: string;
}) {
	const hasText = segments.some((s) => s.value.length > 0);
	if (!hasText) {
		return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
	}
	if (layout === "split") {
		return (
			<SideBySideDiffView
				segments={segments}
				oldLabel={baseLabel}
				newLabel={compareLabel}
			/>
		);
	}
	return <TextDiffView segments={segments} />;
}

interface VersionCompareProps {
	versions: CompareVersion[];
	currentVersionNumber: number;
	base: number;
	compare: number;
	layout: CompareLayout;
	onBaseChange: (version: number) => void;
	onCompareChange: (version: number) => void;
	onLayoutChange: (layout: CompareLayout) => void;
	/**
	 * Render the Authors/Keywords diff panels. Off by default so blind-review
	 * callers never surface author identities; the editor view opts in.
	 */
	showMetadata?: boolean;
}

// fallow-ignore-next-line complexity -- presentational render body, coverage-driven CRAP
function VersionCompareBody({
	sorted,
	baseV,
	compareV,
	currentVersionNumber,
	base,
	compare,
	layout,
	onBaseChange,
	onCompareChange,
	onLayoutChange,
	showMetadata,
}: VersionCompareProps & {
	sorted: CompareVersion[];
	baseV: CompareVersion;
	compareV: CompareVersion;
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

	const isFileChanged = fileChanged(fileIdOf(baseV), fileIdOf(compareV));
	const samePair = base === compare;
	const metadataChanged =
		showMetadata &&
		(listChanged(
			diffList(
				baseV.authors ?? [],
				compareV.authors ?? [],
				(a) => a.email,
				authorsEqual,
			),
		) ||
			listChanged(
				diffList(baseV.keywords ?? [], compareV.keywords ?? [], (k) => k),
			));
	const hasFieldChange =
		[titleSegments, contentSegments].some((segs) =>
			segs.some((s) => s.type !== "equal"),
		) || metadataChanged;
	// Two distinct versions whose every compared field — and the attached file —
	// is unchanged: surface that explicitly instead of letting the reader hunt for
	// a diff that isn't there.
	const identical = !samePair && !hasFieldChange && !isFileChanged;
	const baseLabel = `v${base} (${formatDate(baseV.createdAt)})`;
	const compareLabel = `v${compare} (${formatDate(compareV.createdAt)})`;

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
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
				</CardHeader>
				<CardContent className="space-y-2">
					{samePair && (
						<p className="text-sm text-muted-foreground">
							Select two different versions to see a diff.
						</p>
					)}
					{identical && (
						<div
							className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
							data-testid="diff-identical"
						>
							These two versions are identical — nothing changed between{" "}
							{baseLabel} and {compareLabel}.
						</div>
					)}
				</CardContent>
			</Card>

			<SectionCard title="Title">
				<FieldDiff
					layout={layout}
					segments={titleSegments}
					baseLabel={baseLabel}
					compareLabel={compareLabel}
					emptyLabel="No title."
				/>
			</SectionCard>

			{showMetadata && (
				<SectionCard title="Authors">
					<AuthorsDiff
						base={baseV.authors ?? []}
						compare={compareV.authors ?? []}
						emptyLabel="No authors."
						layout={layout}
						oldLabel={baseLabel}
						newLabel={compareLabel}
					/>
				</SectionCard>
			)}

			{showMetadata && (
				<SectionCard title="Keywords">
					<KeywordsDiff
						base={baseV.keywords ?? []}
						compare={compareV.keywords ?? []}
						emptyLabel="No keywords."
						layout={layout}
						oldLabel={baseLabel}
						newLabel={compareLabel}
					/>
				</SectionCard>
			)}

			<SectionCard title="Attached file">
				<FileRows
					baseLabel={baseLabel}
					compareLabel={compareLabel}
					baseName={fileNameOf(baseV)}
					compareName={fileNameOf(compareV)}
					baseFileId={baseV.file?.id}
					compareFileId={compareV.file?.id}
					isFileChanged={isFileChanged}
				/>
			</SectionCard>

			{compareV.comment && (
				<SectionCard title={`Author's note for v${compare}`}>
					<p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
						{compareV.comment}
					</p>
				</SectionCard>
			)}

			{(baseV.content || compareV.content) && (
				<SectionCard title="Content">
					<FieldDiff
						layout={layout}
						segments={contentSegments}
						baseLabel={baseLabel}
						compareLabel={compareLabel}
						emptyLabel="No content."
					/>
				</SectionCard>
			)}

			<FileChangesPanel
				baseV={baseV}
				compareV={compareV}
				samePair={samePair}
				isFileChanged={isFileChanged}
				layout={layout}
				baseLabel={baseLabel}
				compareLabel={compareLabel}
			/>
		</div>
	);
}

/** File-level diff panel — shown only when the attached file actually changed. */
function FileChangesPanel({
	baseV,
	compareV,
	samePair,
	isFileChanged,
	layout,
	baseLabel,
	compareLabel,
}: {
	baseV: CompareVersion;
	compareV: CompareVersion;
	samePair: boolean;
	isFileChanged: boolean;
	layout: CompareLayout;
	baseLabel: string;
	compareLabel: string;
}) {
	if (samePair || !isFileChanged) return null;
	return (
		<SectionCard
			title={layout === "split" ? "File contents" : "File changes (redline)"}
		>
			<FileRedlineView
				oldVersionId={baseV.id}
				newVersionId={compareV.id}
				layout={layout}
				oldLabel={baseLabel}
				newLabel={compareLabel}
			/>
		</SectionCard>
	);
}

export function VersionCompare(props: VersionCompareProps) {
	const { versions, base, compare } = props;
	const sorted = useMemo(
		() => [...versions].sort((a, b) => a.version - b.version),
		[versions],
	);
	const baseV = sorted.find((v) => v.version === base);
	const compareV = sorted.find((v) => v.version === compare);

	if (sorted.length < 2 || !baseV || !compareV) {
		return (
			<Card>
				<CardContent className="py-8 text-center text-sm text-muted-foreground">
					This submission has only one version — nothing to compare yet.
				</CardContent>
			</Card>
		);
	}

	return (
		<VersionCompareBody
			{...props}
			sorted={sorted}
			baseV={baseV}
			compareV={compareV}
		/>
	);
}
