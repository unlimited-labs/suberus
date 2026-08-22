import { IconDownload, IconShieldCheck, IconTrash } from "@tabler/icons-react";
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
	signed?: boolean;
	downloadHref?: string;
	prominentDownload?: boolean;
	showStatus?: boolean;
	onDelete?: () => void;
	deleteLabel?: string;
	testId?: string;
	downloadTestId?: string;
}

export function DocumentCard({
	name,
	createdAt,
	size,
	status,
	error,
	signed = false,
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
			className="bg-card hover:border-foreground/20 hover:bg-accent/40 flex items-center gap-3 rounded-xl border p-3 transition-colors sm:p-4"
			data-testid={testId}
		>
			<DocumentIconTile status={status} />
			<div className="min-w-0 flex-1">
				<p className="flex items-center gap-1.5 truncate text-sm font-medium">
					{name}
					{signed && (
						<IconShieldCheck
							aria-label="Digitally signed"
							className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
							data-testid="document-signed-badge"
						/>
					)}
				</p>
				<p className="text-muted-foreground text-xs">
					{formatDateTime(createdAt)} · {formatBytes(size)}
				</p>
				{status === "FAILED" && error && (
					<p className="text-destructive mt-0.5 truncate text-xs">{error}</p>
				)}
			</div>
			{showStatus && <DocumentStatusBadge status={status} />}
			{downloadHref &&
				(prominentDownload ? (
					<Button
						asChild
						data-testid={downloadTestId}
						size="sm"
						variant="outline"
					>
						<a href={downloadHref}>
							<IconDownload className="mr-2 size-4" />
							Download
						</a>
					</Button>
				) : (
					<Button
						asChild
						data-testid={downloadTestId}
						size="icon-sm"
						variant="ghost"
					>
						<a aria-label="Download" href={downloadHref}>
							<IconDownload className="size-4" />
						</a>
					</Button>
				))}
			{onDelete && (
				<Button
					aria-label={deleteLabel}
					className="text-destructive hover:text-destructive"
					onClick={onDelete}
					size="icon-sm"
					variant="ghost"
				>
					<IconTrash className="size-4" />
				</Button>
			)}
		</div>
	);
}
