import { IconFiles } from "@tabler/icons-react";
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
	DocumentFilters,
	type StatusFilter,
} from "@/features/documents/components/document-filters";
import { DocumentsEmptyState } from "@/features/documents/components/documents-empty-state";
import { GeneratedDocumentsList } from "@/features/documents/components/generated-documents-list";
import { getErrorMessage } from "@/shared/lib/error-message";
import { SectionCard } from "@/shared/ui/section-card";
import { Skeleton } from "@/shared/ui/skeleton";

export function GeneratedDocumentsTab() {
	const queryClient = useQueryClient();
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

	const clearFilters = () => {
		setSearch("");
		setStatus("ALL");
		setTemplateId("ALL");
	};

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
		}
		setBusy(false);
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
				<DocumentsEmptyState hasFilters={hasFilters} onClear={clearFilters} />
			) : (
				<GeneratedDocumentsList
					documents={documents}
					onDelete={setDeletingId}
				/>
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
