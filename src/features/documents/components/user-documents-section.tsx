import {
	IconDownload,
	IconFileCertificate,
	IconFilePlus,
	IconTrash,
} from "@tabler/icons-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
	adminUserDocumentsQueryOptions,
	deleteDocumentFn,
} from "@/features/documents/api/documents";
import {
	DocumentStatusBadge,
	formatBytes,
} from "@/features/documents/components/document-bits";
import { UserDocumentDialog } from "@/features/documents/components/user-document-dialog";
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
import { SectionCard } from "@/shared/ui/section-card";

interface UserDocumentsSectionProps {
	userId: string;
	userName: string;
}

export function UserDocumentsSection({
	userId,
	userName,
}: UserDocumentsSectionProps) {
	const queryClient = useQueryClient();
	const { formatDateTime } = useDateFormat();
	const [addOpen, setAddOpen] = useState(false);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	const { data: documents = [] } = useQuery({
		...adminUserDocumentsQueryOptions(userId),
		refetchInterval: (query) =>
			query.state.data?.some((d) => d.status === "PENDING") ? 2000 : false,
	});

	const handleDelete = async () => {
		if (!deletingId) return;
		setBusy(true);
		try {
			await deleteDocumentFn({ data: { id: deletingId } });
			await queryClient.invalidateQueries({
				queryKey: adminUserDocumentsQueryOptions(userId).queryKey,
			});
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
			icon={IconFileCertificate}
			title="Documents"
			action={
				<Button
					variant="outline"
					size="sm"
					onClick={() => setAddOpen(true)}
					data-testid="add-document-button"
				>
					<IconFilePlus className="mr-2 size-4" />
					Add document
				</Button>
			}
		>
			{documents.length === 0 ? (
				<p className="text-sm text-muted-foreground">
					No documents generated for this participant yet.
				</p>
			) : (
				<div className="space-y-2">
					{documents.map((d) => (
						<div
							key={d.id}
							data-testid="user-document-row"
							className="flex items-center gap-3 rounded-lg border bg-card p-3"
						>
							<div className="min-w-0 flex-1">
								<p className="truncate text-sm font-medium">{d.name}</p>
								<p className="text-xs text-muted-foreground">
									{formatDateTime(d.createdAt)} · {formatBytes(d.size)}
								</p>
								{d.status === "FAILED" && d.error && (
									<p className="mt-0.5 truncate text-xs text-destructive">
										{d.error}
									</p>
								)}
							</div>
							<DocumentStatusBadge status={d.status} />
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
								aria-label="Delete document"
							>
								<IconTrash className="size-4" />
							</Button>
						</div>
					))}
				</div>
			)}

			<UserDocumentDialog
				open={addOpen}
				onOpenChange={setAddOpen}
				userId={userId}
				userName={userName}
			/>

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
