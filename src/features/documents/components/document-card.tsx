import { IconDownload, IconTrash } from "@tabler/icons-react";
import {
	DocumentIconTile,
	DocumentStatusBadge,
	formatBytes,
} from "@/features/documents/components/document-bits";
import type { DocumentStatus } from "@/generated/prisma/enums";
import { useDateFormat } from "@/shared/hooks/use-date-format";
import { Button } from "@/shared/ui/button";

interface DocumentCardProps {
	name: string;
	createdAt: Date;
	size: number | null;
	status: DocumentStatus;
	error?: string | null;
	/** Download endpoint; when absent the download action is hidden. */
	downloadHref?: string;
	/** Render the download as a labelled button (user-facing primary action). */
	prominentDownload?: boolean;
	/** Show the coloured status badge. Off for single-status lists. */
	showStatus?: boolean;
	onDelete?: () => void;
	deleteLabel?: string;
	testId?: string;
	downloadTestId?: string;
}

/**
 * Shared document row: status-coloured icon tile, name + meta, optional
 * status badge, download and delete actions. Used by the participant list,
 * the admin per-user section and the admin table's mobile layout.
 */
export function DocumentCard({
	name,
	createdAt,
	size,
	status,
	error,
	downloadHref,
	prominentDownload = false,
	showStatus = true,
	onDelete,
	deleteLabel = "Delete document",
	testId,
	downloadTestId,
}: DocumentCardProps) {
	const { formatDateTime } = useDateFormat();

	return (
		<div
			data-testid={testId}
			className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:border-foreground/20 hover:bg-accent/40 sm:p-4"
		>
			<DocumentIconTile status={status} />
			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-medium">{name}</p>
				<p className="text-xs text-muted-foreground">
					{formatDateTime(createdAt)} · {formatBytes(size)}
				</p>
				{status === "FAILED" && error && (
					<p className="mt-0.5 truncate text-xs text-destructive">{error}</p>
				)}
			</div>
			{showStatus && <DocumentStatusBadge status={status} />}
			{downloadHref &&
				(prominentDownload ? (
					<Button
						asChild
						variant="outline"
						size="sm"
						data-testid={downloadTestId}
					>
						<a href={downloadHref}>
							<IconDownload className="mr-2 size-4" />
							Download
						</a>
					</Button>
				) : (
					<Button
						asChild
						variant="ghost"
						size="icon-sm"
						aria-label="Download"
						data-testid={downloadTestId}
					>
						<a href={downloadHref}>
							<IconDownload className="size-4" />
						</a>
					</Button>
				))}
			{onDelete && (
				<Button
					variant="ghost"
					size="icon-sm"
					onClick={onDelete}
					className="text-destructive hover:text-destructive"
					aria-label={deleteLabel}
				>
					<IconTrash className="size-4" />
				</Button>
			)}
		</div>
	);
}
