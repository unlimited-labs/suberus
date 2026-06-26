import {
	PLACEHOLDER_LABELS,
	type PlaceholderKey,
} from "@/features/documents/lib/placeholders";
import type { DocumentStatus } from "@/generated/prisma/enums";
import { Badge } from "@/shared/ui/badge";

export function PlaceholderChips({ placeholders }: { placeholders: string[] }) {
	if (placeholders.length === 0) {
		return (
			<span className="text-xs text-muted-foreground">No placeholders</span>
		);
	}
	return (
		<div className="flex flex-wrap gap-1">
			{placeholders.map((p) => (
				<Badge key={p} variant="outline" className="font-mono text-[10px]">
					{`{${p}}`}
				</Badge>
			))}
		</div>
	);
}

export function placeholderLabel(key: string): string {
	return PLACEHOLDER_LABELS[key as PlaceholderKey] ?? key;
}

const STATUS_META: Record<
	DocumentStatus,
	{ label: string; variant: "secondary" | "default" | "destructive" }
> = {
	PENDING: { label: "Generating…", variant: "secondary" },
	READY: { label: "Ready", variant: "default" },
	FAILED: { label: "Failed", variant: "destructive" },
};

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
	const meta = STATUS_META[status];
	return (
		<Badge variant={meta.variant} data-testid={`doc-status-${status}`}>
			{meta.label}
		</Badge>
	);
}

export function formatBytes(bytes: number | null | undefined): string {
	if (!bytes) return "—";
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
