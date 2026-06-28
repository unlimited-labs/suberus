import { IconDownload, IconFiles, IconTrash } from "@tabler/icons-react";
import {
	useQuery,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
	adminDocumentsQueryOptions,
	deleteDocumentFn,
	documentTemplatesQueryOptions,
} from "@/features/documents/api/documents";
import { ConfirmDeleteDialog } from "@/features/documents/components/confirm-delete-dialog";
import {
	DocumentIconTile,
	DocumentStatusBadge,
	formatBytes,
} from "@/features/documents/components/document-bits";
import {
	DocumentFilters,
	type StatusFilter,
} from "@/features/documents/components/document-filters";
import { useDateFormat } from "@/shared/hooks/use-date-format";
import { getErrorMessage } from "@/shared/lib/error-message";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { SectionCard } from "@/shared/ui/section-card";
import { Skeleton } from "@/shared/ui/skeleton";
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

export function GeneratedDocumentsTab() {
	const queryClient = useQueryClient();
	const { formatDateTime } = useDateFormat();
	const [search, setSearch] = useState("");
	const [status, setStatus] = useState<StatusFilter>("ALL");
	const [templateId, setTemplateId] = useState<string>("ALL");
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	const { data: templates } = useSuspenseQuery(documentTemplatesQueryOptions());

	const hasFilters =
		search.trim() !== "" || status !== "ALL" || templateId !== "ALL";

	const filters = {
		search: search.trim() || undefined,
		status: status === "ALL" ? undefined : status,
		templateId: templateId === "ALL" ? undefined : templateId,
	};

	const { data: documents = [], isLoading } = useQuery({
		...adminDocumentsQueryOptions(filters),
		refetchInterval: (query) =>
			query.state.data?.some((d) => d.status === "PENDING") ? 2000 : false,
	});

	const handleDelete = async () => {
		if (!deletingId) return;
		setBusy(true);
		try {
			await deleteDocumentFn({ data: { id: deletingId } });
			await queryClient.invalidateQueries({ queryKey: ["documents"] });
			setDeletingId(null);
			toast.success("Document deleted");
		} catch (error) {
			toast.error(getErrorMessage(error, "Failed to delete"));
		} finally {
			setBusy(false);
		}
	};

	return (
		<SectionCard
			icon={IconFiles}
			title="Generated documents"
			description="Every document issued to participants, across the conference."
			contentClassName="space-y-4"
		>
			<DocumentFilters
				search={search}
				onSearchChange={setSearch}
				status={status}
				onStatusChange={setStatus}
				templateId={templateId}
				onTemplateChange={setTemplateId}
				templates={templates}
			/>

			{isLoading ? (
				<div className="space-y-2">
					{[0, 1, 2, 3].map((i) => (
						<Skeleton key={i} className="h-16 w-full rounded-xl" />
					))}
				</div>
			) : documents.length === 0 ? (
				<EmptyState
					icon={IconFiles}
					title={hasFilters ? "No matching documents" : "No documents yet"}
					description={
						hasFilters
							? "No documents match the current filters. Try clearing them."
							: "Documents generated for participants will appear here."
					}
					action={
						hasFilters ? (
							<Button
								variant="outline"
								size="sm"
								onClick={() => {
									setSearch("");
									setStatus("ALL");
									setTemplateId("ALL");
								}}
							>
								Clear filters
							</Button>
						) : undefined
					}
				/>
			) : (
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
									{d.status === "READY" && d.hasFile && (
										<Button
											asChild
											variant="ghost"
											size="icon-sm"
											aria-label="Download"
										>
											<a href={`/api/documents/${d.id}`}>
												<IconDownload className="size-4" />
											</a>
										</Button>
									)}
									<Button
										variant="ghost"
										size="icon-sm"
										onClick={() => setDeletingId(d.id)}
										className="text-destructive hover:text-destructive"
										aria-label="Delete"
									>
										<IconTrash className="size-4" />
									</Button>
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
											<p className="text-sm font-medium">
												{d.participant.name}
											</p>
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
												{d.status === "READY" && d.hasFile && (
													<Button
														asChild
														variant="ghost"
														size="icon-sm"
														aria-label="Download"
													>
														<a href={`/api/documents/${d.id}`}>
															<IconDownload className="size-4" />
														</a>
													</Button>
												)}
												<Button
													variant="ghost"
													size="icon-sm"
													onClick={() => setDeletingId(d.id)}
													className="text-destructive hover:text-destructive"
													aria-label="Delete"
												>
													<IconTrash className="size-4" />
												</Button>
											</div>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				</>
			)}

			<ConfirmDeleteDialog
				open={deletingId !== null}
				onOpenChange={(o) => {
					if (!o) setDeletingId(null);
				}}
				busy={busy}
				title="Delete document?"
				description="This removes the generated file. The participant will no longer see it."
				onConfirm={handleDelete}
			/>
		</SectionCard>
	);
}
