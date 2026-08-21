import { IconFileCertificate, IconFilePlus } from "@tabler/icons-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
	adminUserDocumentsQueryOptions,
	deleteDocumentFn,
} from "@/features/documents/api/documents";
import { ConfirmDeleteDialog } from "@/features/documents/components/confirm-delete-dialog";
import { DocumentCard } from "@/features/documents/components/document-card";
import { UserDocumentDialog } from "@/features/documents/components/user-document-dialog";
import { getErrorMessage } from "@/shared/lib/error-message";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { SectionCard } from "@/shared/ui/section-card";

interface UserDocumentsSectionProps {
	userId: string;
	userName: string;
	/** Add-document dialog open state, controlled by the parent so the header
	 *  action menu can open it too. */
	addOpen: boolean;
	onAddOpenChange: (open: boolean) => void;
}

export function UserDocumentsSection({
	userId,
	userName,
	addOpen,
	onAddOpenChange,
}: UserDocumentsSectionProps) {
	const queryClient = useQueryClient();
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
		}
		setBusy(false);
	};

	return (
		<SectionCard
			action={
				<Button
					data-testid="add-document-button"
					onClick={() => onAddOpenChange(true)}
					size="sm"
					variant="outline"
				>
					<IconFilePlus className="mr-2 size-4" />
					Add document
				</Button>
			}
			icon={IconFileCertificate}
			title="Documents"
		>
			{documents.length === 0 ? (
				<EmptyState
					description="Generate a document for this participant from one of your templates."
					icon={IconFileCertificate}
					title="No documents yet"
				/>
			) : (
				<div className="space-y-2">
					{documents.map((d) => (
						<DocumentCard
							createdAt={d.createdAt}
							downloadHref={
								d.status === "READY" && d.hasFile
									? `/api/documents/${d.id}`
									: undefined
							}
							error={d.error}
							key={d.id}
							name={d.name}
							onDelete={() => setDeletingId(d.id)}
							signed={d.signed}
							size={d.size}
							status={d.status}
							testId="user-document-row"
						/>
					))}
				</div>
			)}

			<UserDocumentDialog
				onOpenChange={onAddOpenChange}
				open={addOpen}
				userId={userId}
				userName={userName}
			/>

			<ConfirmDeleteDialog
				busy={busy}
				description="This removes the generated file. The participant will no longer see it."
				onConfirm={handleDelete}
				onOpenChange={(o) => {
					if (!o) setDeletingId(null);
				}}
				open={deletingId !== null}
				title="Delete document?"
			/>
		</SectionCard>
	);
}
