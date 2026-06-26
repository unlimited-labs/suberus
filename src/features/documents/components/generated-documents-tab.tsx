import {
	IconDownload,
	IconFiles,
	IconSearch,
	IconTrash,
} from "@tabler/icons-react";
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
import {
	DocumentStatusBadge,
	formatBytes,
} from "@/features/documents/components/document-bits";
import { useDateFormat } from "@/shared/hooks/use-date-format";
import { getErrorMessage } from "@/shared/lib/error-message";
import { Button } from "@/shared/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { SectionCard } from "@/shared/ui/section-card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/shared/ui/table";

type StatusFilter = "ALL" | "PENDING" | "READY" | "FAILED";

export function GeneratedDocumentsTab() {
	const queryClient = useQueryClient();
	const { formatDateTime } = useDateFormat();
	const [search, setSearch] = useState("");
	const [status, setStatus] = useState<StatusFilter>("ALL");
	const [templateId, setTemplateId] = useState<string>("ALL");
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	const { data: templates } = useSuspenseQuery(documentTemplatesQueryOptions());

	const filters = {
		search: search.trim() || undefined,
		status: status === "ALL" ? undefined : status,
		templateId: templateId === "ALL" ? undefined : templateId,
	};

	const { data: documents = [] } = useQuery({
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
			<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
				<div className="relative flex-1">
					<IconSearch className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
					<Input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Search by participant…"
						className="pl-8"
						data-testid="documents-search"
					/>
				</div>
				<Select
					value={status}
					onValueChange={(v) => setStatus(v as StatusFilter)}
				>
					<SelectTrigger className="w-full sm:w-40">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="ALL">All statuses</SelectItem>
						<SelectItem value="READY">Ready</SelectItem>
						<SelectItem value="PENDING">Generating</SelectItem>
						<SelectItem value="FAILED">Failed</SelectItem>
					</SelectContent>
				</Select>
				<Select value={templateId} onValueChange={setTemplateId}>
					<SelectTrigger className="w-full sm:w-48">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="ALL">All templates</SelectItem>
						{templates.map((t) => (
							<SelectItem key={t.id} value={t.id}>
								{t.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{documents.length === 0 ? (
				<div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
					No documents match.
				</div>
			) : (
				<div className="overflow-x-auto rounded-lg border">
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
											<p className="mt-0.5 max-w-48 truncate text-xs text-destructive">
												{d.error}
											</p>
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
			)}

			<Dialog
				open={deletingId !== null}
				onOpenChange={(o) => {
					if (!o && !busy) setDeletingId(null);
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete document?</DialogTitle>
						<DialogDescription>
							This removes the generated file. The participant will no longer
							see it.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setDeletingId(null)}
							disabled={busy}
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={handleDelete}
							disabled={busy}
						>
							Delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</SectionCard>
	);
}
