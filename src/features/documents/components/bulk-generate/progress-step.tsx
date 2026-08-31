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
		<div aria-live="polite" className="space-y-3 py-1">
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
				<div className="border-destructive/30 max-h-48 overflow-auto rounded-md border p-2">
					{progress.failures.map((f) => (
						<div
							className="flex items-center justify-between gap-2 p-1 text-xs"
							key={f.id}
						>
							<span className="truncate">{f.participant}</span>
							<span className="text-destructive shrink-0">
								{f.error ?? "Failed"}
							</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
