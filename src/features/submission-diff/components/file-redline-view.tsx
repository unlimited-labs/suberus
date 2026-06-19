import { useQuery } from "@tanstack/react-query";
import { type Ref, type RefObject, useRef } from "react";
import { versionRedlineQueryOptions } from "@/features/submission-diff/api";

/** Wrap a sanitized HTML fragment in a minimal self-contained document. */
function wrapDoc(html: string): string {
	return `<!doctype html><html><head><meta charset="utf-8">
	<link rel="stylesheet" href="/katex/katex.min.css"><style>
		body{font:14px/1.6 system-ui,-apple-system,sans-serif;margin:0;padding:12px;color:#0f172a}
		img{max-width:100%;height:auto}
		ins{background:#dcfce7;text-decoration:none}
		del{background:#fee2e2;text-decoration:line-through}
		table{border-collapse:collapse}
		td,th{border:1px solid #e2e8f0;padding:4px 8px}
		/* Box a changed figure instead of striking it through, with a label. */
		del:has(img),ins:has(img){display:block;padding:8px;margin:12px 0;border:3px solid;border-radius:10px;text-decoration:none}
		del:has(img) img,ins:has(img) img{display:block}
		del:has(img){border-color:#dc2626;background:#fef2f2}
		ins:has(img){border-color:#16a34a;background:#f0fdf4}
		del:has(img)::before,ins:has(img)::before{display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px}
		del:has(img)::before{content:"− removed figure";color:#dc2626}
		ins:has(img)::before{content:"+ added figure";color:#16a34a}
	</style></head><body>${html}</body></html>`;
}

/**
 * Split the unified redline into its two single-version halves, mirroring the POC
 * (poc/s1-inline-diff): the old side is the redline with insertions removed (so it
 * reconstructs the old document with its deletions still marked), the new side is
 * the redline with deletions removed. htmldiff never nests ins/del, so a non-greedy
 * tag strip is sufficient. The shared ins/del CSS then highlights each half.
 */
const stripInsertions = (redline: string): string =>
	redline.replace(/<ins\b[^>]*>[\s\S]*?<\/ins>/g, "");
const stripDeletions = (redline: string): string =>
	redline.replace(/<del\b[^>]*>[\s\S]*?<\/del>/g, "");

/** Sandboxed frame for already-sanitized author HTML. */
function DocFrame({
	title,
	html,
	ref,
	onLoad,
}: {
	title: string;
	html: string;
	ref?: Ref<HTMLIFrameElement>;
	onLoad?: () => void;
}) {
	return (
		<iframe
			ref={ref}
			onLoad={onLoad}
			title={title}
			sandbox="allow-same-origin"
			srcDoc={wrapDoc(html)}
			className="h-[60vh] w-full rounded-lg border border-border bg-white"
		/>
	);
}

/** Proportionally mirror one scroller's position onto another (handles differing lengths). */
function mirrorScroll(from: Element, to: Element): void {
	const max = from.scrollHeight - from.clientHeight;
	const ratio = max > 0 ? from.scrollTop / max : 0;
	to.scrollTop = ratio * (to.scrollHeight - to.clientHeight);
}

/**
 * Mirror scrolling between the two same-origin document frames. Proportional
 * (by scroll ratio) so documents of different lengths stay roughly aligned.
 * A directional "driver" guard tracks which frame the user is actively scrolling
 * so the mirrored scroll on the other frame doesn't echo back, while still
 * letting the driver scroll continuously; it self-releases shortly after the
 * user stops (via setTimeout, which — unlike rAF — keeps running in a hidden
 * tab, so the guard can never get stuck). The frame is re-bound on every
 * (re)load: a reload replaces the contentWindow, discarding the old listener.
 */
function useSyncedScroll() {
	const oldRef = useRef<HTMLIFrameElement>(null);
	const newRef = useRef<HTMLIFrameElement>(null);
	const driver = useRef<"old" | "new" | null>(null);
	const release = useRef<ReturnType<typeof setTimeout>>(undefined);

	const bind = (
		side: "old" | "new",
		selfRef: RefObject<HTMLIFrameElement | null>,
		otherRef: RefObject<HTMLIFrameElement | null>,
	) => {
		const echoSide = side === "old" ? "new" : "old";
		return () => {
			const self = selfRef.current?.contentWindow;
			if (!self) return;
			self.addEventListener(
				"scroll",
				() => {
					// Ignore the echo: the mirrored scroll on the side we just drove.
					if (driver.current === echoSide) return;
					const from = self.document.scrollingElement;
					const to = otherRef.current?.contentWindow?.document.scrollingElement;
					if (!from || !to) return;
					driver.current = side;
					mirrorScroll(from, to);
					clearTimeout(release.current);
					release.current = setTimeout(() => {
						driver.current = null;
					}, 100);
				},
				{ passive: true },
			);
		};
	};

	return {
		oldRef,
		newRef,
		onOldLoad: bind("old", oldRef, newRef),
		onNewLoad: bind("new", newRef, oldRef),
	};
}

/** "+N −M changed blocks" summary shared by both layouts. */
function ChangeCounts({
	insertions,
	deletions,
}: {
	insertions: number;
	deletions: number;
}) {
	return (
		<p className="text-sm text-muted-foreground">
			<span className="text-emerald-600 dark:text-emerald-400">
				+{insertions}
			</span>{" "}
			<span className="text-red-600 dark:text-red-400">−{deletions}</span>{" "}
			changed blocks
		</p>
	);
}

const LOADING = (
	<p className="text-sm text-muted-foreground">Loading file redline…</p>
);
const UNAVAILABLE = (
	<p className="text-sm text-muted-foreground">
		No file-level redline — these versions have no uploaded DOCX, or it hasn't
		been processed yet.
	</p>
);

interface FileRedlineViewProps {
	oldVersionId: string;
	newVersionId: string;
	/** "inline" = one unified redline; "split" = old vs new documents side by side. */
	layout: "inline" | "split";
	oldLabel: string;
	newLabel: string;
}

/**
 * File-level comparison of two versions in sandboxed iframes.
 * `sandbox="allow-same-origin"` (no allow-scripts) keeps author content inert
 * while still letting the auth-gated figure proxy load. Content is already
 * DOMPurify-sanitized server-side. The "split" layout reconstructs each document
 * on its own; "inline" shows the unified redline.
 */
export function FileRedlineView({
	oldVersionId,
	newVersionId,
	layout,
	oldLabel,
	newLabel,
}: FileRedlineViewProps) {
	if (layout === "split") {
		return (
			<SplitDocuments
				oldVersionId={oldVersionId}
				newVersionId={newVersionId}
				oldLabel={oldLabel}
				newLabel={newLabel}
			/>
		);
	}
	return (
		<InlineRedline oldVersionId={oldVersionId} newVersionId={newVersionId} />
	);
}

function InlineRedline({
	oldVersionId,
	newVersionId,
}: {
	oldVersionId: string;
	newVersionId: string;
}) {
	const { data, isPending } = useQuery(
		versionRedlineQueryOptions(newVersionId, oldVersionId),
	);

	if (isPending) return LOADING;
	if (!data) return UNAVAILABLE;

	return (
		<div className="space-y-2" data-testid="file-redline">
			<ChangeCounts insertions={data.insertions} deletions={data.deletions} />
			<DocFrame title="File redline" html={data.html} />
		</div>
	);
}

function SplitDocuments({
	oldVersionId,
	newVersionId,
	oldLabel,
	newLabel,
}: {
	oldVersionId: string;
	newVersionId: string;
	oldLabel: string;
	newLabel: string;
}) {
	const { data, isPending } = useQuery(
		versionRedlineQueryOptions(newVersionId, oldVersionId),
	);
	const { oldRef, newRef, onOldLoad, onNewLoad } = useSyncedScroll();

	if (isPending) return LOADING;
	if (!data) return UNAVAILABLE;

	return (
		<div className="space-y-2" data-testid="file-redline">
			<ChangeCounts insertions={data.insertions} deletions={data.deletions} />
			<div
				className="grid gap-4 md:grid-cols-2"
				data-testid="file-redline-split"
			>
				<div className="space-y-2">
					<div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
						{oldLabel} · deletions marked
					</div>
					<DocFrame
						ref={oldRef}
						onLoad={onOldLoad}
						title={`File ${oldLabel}`}
						html={stripInsertions(data.html)}
					/>
				</div>
				<div className="space-y-2">
					<div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
						{newLabel} · insertions marked
					</div>
					<DocFrame
						ref={newRef}
						onLoad={onNewLoad}
						title={`File ${newLabel}`}
						html={stripDeletions(data.html)}
					/>
				</div>
			</div>
		</div>
	);
}
