import type { BatchProgress } from "@/features/documents/server/bulk";
import { Badge } from "@/shared/ui/badge";
import { Progress } from "@/shared/ui/progress";

export function ProgressStep({
	progress,
	pct,
}: {
	progress: BatchProgress;
	pct: number;
}) {
	return (
		<div className="space-y-3 py-1" aria-live="polite">
			<Progress value={pct} />
			<div className="flex flex-wrap items-center gap-2 text-sm">
				<Badge variant="default">{progress.ready} ready</Badge>
				<Badge variant="secondary">{progress.pending} pending</Badge>
				{progress.failed > 0 && (
					<Badge variant="destructive">{progress.failed} failed</Badge>
				)}
				<span className="text-muted-foreground">of {progress.total}</span>
			</div>
			{progress.failures.length > 0 && (
				<div className="max-h-48 overflow-auto rounded-md border border-destructive/30 p-2">
					{progress.failures.map((f) => (
						<div
							key={f.id}
							className="flex items-center justify-between gap-2 px-1 py-1 text-xs"
						>
							<span className="truncate">{f.participant}</span>
							<span className="shrink-0 text-destructive">
								{f.error ?? "Failed"}
							</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
