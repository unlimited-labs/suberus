import { IconAlertTriangle, IconUsers } from "@tabler/icons-react";
import { placeholderLabel } from "@/features/documents/components/document-bits";
import type { BulkPreview } from "@/features/documents/server/bulk";

export function ReviewStep({ preview }: { preview: BulkPreview }) {
	return (
		<div className="space-y-3 py-1">
			<div className="bg-muted/40 flex items-center gap-2 rounded-md border p-3">
				<IconUsers className="text-primary size-5" />
				<p className="text-sm">
					<span className="font-semibold">{preview.resolvableIds.length}</span>{" "}
					will be generated
					{preview.skipped.length > 0 && (
						<>
							,{" "}
							<span className="font-semibold text-amber-600">
								{preview.skipped.length}
							</span>{" "}
							skipped
						</>
					)}
					.
				</p>
			</div>
			{preview.skipped.length > 0 && (
				<div className="max-h-56 overflow-auto rounded-md border border-amber-200 bg-amber-50/60 p-2 dark:border-amber-900/40 dark:bg-amber-950/20">
					<div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
						<IconAlertTriangle className="size-3.5" />
						Skipped — missing data
					</div>
					{preview.skipped.map((s) => (
						<div
							className="flex items-center justify-between gap-2 px-1 py-1 text-xs"
							key={s.userId}
						>
							<span className="truncate">{s.name}</span>
							<span className="text-muted-foreground shrink-0">
								{s.missing.map(placeholderLabel).join(", ")}
							</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
