import { useQuery } from "@tanstack/react-query";
import { versionRedlineQueryOptions } from "@/features/submission-diff/api";

/** Wrap the sanitized redline fragment in a minimal self-contained document. */
function wrapRedline(html: string): string {
	return `<!doctype html><html><head><meta charset="utf-8">
	<link rel="stylesheet" href="/katex/katex.min.css"><style>
		body{font:14px/1.6 system-ui,-apple-system,sans-serif;margin:0;padding:12px;color:#0f172a}
		img{max-width:100%;height:auto}
		ins{background:#dcfce7;text-decoration:none}
		del{background:#fee2e2;text-decoration:line-through}
		table{border-collapse:collapse}
		td,th{border:1px solid #e2e8f0;padding:4px 8px}
	</style></head><body>${html}</body></html>`;
}

interface FileRedlineViewProps {
	oldVersionId: string;
	newVersionId: string;
}

/**
 * Renders the file-level redline between two versions in a sandboxed iframe.
 * `sandbox="allow-same-origin"` (no allow-scripts) keeps author content inert
 * while still letting the auth-gated figure proxy load. Content is already
 * DOMPurify-sanitized server-side.
 */
export function FileRedlineView({
	oldVersionId,
	newVersionId,
}: FileRedlineViewProps) {
	const { data, isPending } = useQuery(
		versionRedlineQueryOptions(newVersionId, oldVersionId),
	);

	if (isPending) {
		return (
			<p className="text-sm text-muted-foreground">Loading file redline…</p>
		);
	}
	if (!data) {
		return (
			<p className="text-sm text-muted-foreground">
				No file-level redline — these versions have no uploaded DOCX, or it
				hasn't been processed yet.
			</p>
		);
	}

	return (
		<div className="space-y-2" data-testid="file-redline">
			<p className="text-sm text-muted-foreground">
				<span className="text-emerald-600 dark:text-emerald-400">
					+{data.insertions}
				</span>{" "}
				<span className="text-red-600 dark:text-red-400">
					−{data.deletions}
				</span>{" "}
				changed blocks
			</p>
			<iframe
				title="File redline"
				sandbox="allow-same-origin"
				srcDoc={wrapRedline(data.html)}
				className="h-[60vh] w-full rounded-lg border border-border bg-white"
			/>
		</div>
	);
}
