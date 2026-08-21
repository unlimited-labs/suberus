import { IconAlertTriangle, IconCircleCheck } from "@tabler/icons-react";
import { placeholderLabel } from "@/features/documents/components/document-bits";
import type { ResolutionPreview } from "@/features/documents/server/generate";

/** Resolved-data table + missing-placeholder alert for the add-document dialog. */
export function ResolutionPreviewCard({
	preview,
}: {
	preview: ResolutionPreview;
}) {
	const missing = preview.missing;
	const missingSet = new Set(missing);
	return (
		<>
			<div className="overflow-hidden rounded-xl border">
				<div className="bg-muted/40 text-muted-foreground flex items-center justify-between border-b px-3 py-2 text-xs font-medium">
					<span>Resolved data</span>
					{missing.length > 0 && (
						<span className="text-destructive flex items-center gap-1">
							<IconAlertTriangle className="size-3.5" />
							{missing.length} missing
						</span>
					)}
				</div>
				<div className="divide-y">
					{preview.placeholders.length === 0 && (
						<p className="text-muted-foreground px-3 py-2 text-sm">
							This template has no placeholders.
						</p>
					)}
					{preview.placeholders.map((p) => {
						const value = preview.values[p] ?? "";
						const isMissing = missingSet.has(p);
						return (
							<div
								className="flex items-start justify-between gap-3 px-3 py-2"
								data-testid="resolution-row"
								key={p}
							>
								<span className="text-muted-foreground text-xs font-medium">
									{placeholderLabel(p)}
								</span>
								{isMissing ? (
									<span className="text-destructive flex items-center gap-1 text-xs font-medium">
										<IconAlertTriangle className="size-3.5" />
										Missing
									</span>
								) : (
									<span className="flex max-w-[60%] items-center gap-1.5 truncate text-right text-xs">
										<IconCircleCheck className="size-3.5 shrink-0 text-emerald-500" />
										<span className="truncate">{value}</span>
									</span>
								)}
							</div>
						);
					})}
				</div>
			</div>

			{missing.length > 0 && (
				<p
					className="text-destructive flex items-center gap-1.5 text-xs"
					role="alert"
				>
					<IconAlertTriangle className="size-3.5" />
					Cannot generate — missing: {missing.map(placeholderLabel).join(", ")}.
				</p>
			)}
		</>
	);
}
