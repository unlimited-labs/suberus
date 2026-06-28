import { IconDownload, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import {
	DocumentIconTile,
	DocumentStatusBadge,
	formatBytes,
} from "@/features/documents/components/document-bits";
import type { DocumentRow } from "@/features/documents/server/documents";
import { useDateFormat } from "@/shared/hooks/use-date-format";
import { Button } from "@/shared/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/ui/table";

/** FAILED reason: truncated by default, click to reveal the full stored error. */
function FailureReason({ error }: { error: string }) {
	const [open, setOpen] = useState(false);
	return (
		<button
			type="button"
			onClick={() => setOpen((o) => !o)}
			title={open ? "Click to collapse" : "Click to see the full error"}
			data-testid="doc-error"
			className={`mt-0.5 block text-left text-xs text-destructive ${
				open
					? "max-w-md whitespace-pre-wrap break-words"
					: "max-w-48 cursor-pointer truncate"
			}`}
		>
			{error}
		</button>
	);
}

function DownloadButton({ d }: { d: DocumentRow }) {
	if (d.status !== "READY" || !d.hasFile) return null;
	return (
		<Button asChild variant="ghost" size="icon-sm" aria-label="Download">
			<a href={`/api/documents/${d.id}`}>
				<IconDownload className="size-4" />
			</a>
		</Button>
	);
}

function DeleteButton({ onClick }: { onClick: () => void }) {
	return (
		<Button
			variant="ghost"
			size="icon-sm"
			onClick={onClick}
			className="text-destructive hover:text-destructive"
			aria-label="Delete"
		>
			<IconTrash className="size-4" />
		</Button>
	);
}

interface ListProps {
	documents: DocumentRow[];
	onDelete: (id: string) => void;
}

export function GeneratedDocumentsList({ documents, onDelete }: ListProps) {
	const { formatDateTime } = useDateFormat();
	return (
		<>
			{/* Mobile: cards (avoid horizontal table scroll) */}
			<div className="space-y-2 md:hidden">
				{documents.map((d) => (
					<div
						key={d.id}
						data-testid="generated-doc-row"
						className="flex items-start gap-3 rounded-xl border bg-card p-3"
					>
						<DocumentIconTile status={d.status} />
						<div className="min-w-0 flex-1">
							<p className="truncate text-sm font-medium">
								{d.participant.name}
							</p>
							<p className="truncate text-xs text-muted-foreground">
								{d.name} · {formatBytes(d.size)}
							</p>
							<div className="mt-1.5 flex items-center gap-2">
								<DocumentStatusBadge status={d.status} />
								<span className="text-xs text-muted-foreground">
									{formatDateTime(d.createdAt)}
								</span>
							</div>
							{d.status === "FAILED" && d.error && (
								<FailureReason error={d.error} />
							)}
						</div>
						<div className="flex shrink-0 flex-col items-center gap-1">
							<DownloadButton d={d} />
							<DeleteButton onClick={() => onDelete(d.id)} />
						</div>
					</div>
				))}
			</div>

			{/* Desktop: table */}
			<div className="hidden overflow-hidden rounded-xl border md:block">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Participant</TableHead>
							<TableHead>Document</TableHead>
							<TableHead>Template</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Created</TableHead>
							<TableHead className="text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{documents.map((d) => (
							<TableRow key={d.id} data-testid="generated-doc-row">
								<TableCell>
									<p className="text-sm font-medium">{d.participant.name}</p>
									<p className="text-xs text-muted-foreground">
										{d.participant.email}
									</p>
								</TableCell>
								<TableCell>
									<p className="text-sm">{d.name}</p>
									<p className="text-xs text-muted-foreground">
										{formatBytes(d.size)}
									</p>
								</TableCell>
								<TableCell className="text-sm text-muted-foreground">
									{d.templateName ?? "—"}
								</TableCell>
								<TableCell>
									<DocumentStatusBadge status={d.status} />
									{d.status === "FAILED" && d.error && (
										<FailureReason error={d.error} />
									)}
								</TableCell>
								<TableCell className="text-sm text-muted-foreground">
									{formatDateTime(d.createdAt)}
								</TableCell>
								<TableCell className="text-right">
									<div className="flex justify-end gap-1">
										<DownloadButton d={d} />
										<DeleteButton onClick={() => onDelete(d.id)} />
									</div>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</>
	);
}
