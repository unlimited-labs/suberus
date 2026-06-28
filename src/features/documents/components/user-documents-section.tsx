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
					onClick={() => onAddOpenChange(true)}
					data-testid="add-document-button"
				>
					<IconFilePlus className="mr-2 size-4" />
					Add document
				</Button>
			}
		>
			{documents.length === 0 ? (
				<EmptyState
					icon={IconFileCertificate}
					title="No documents yet"
					description="Generate a document for this participant from one of your templates."
				/>
			) : (
				<div className="space-y-2">
					{documents.map((d) => (
						<DocumentCard
							key={d.id}
							name={d.name}
							createdAt={d.createdAt}
							size={d.size}
							status={d.status}
							error={d.error}
							signed={d.signed}
							downloadHref={
								d.status === "READY" && d.hasFile
									? `/api/documents/${d.id}`
									: undefined
							}
							onDelete={() => setDeletingId(d.id)}
							testId="user-document-row"
						/>
					))}
				</div>
			)}

			<UserDocumentDialog
				open={addOpen}
				onOpenChange={onAddOpenChange}
				userId={userId}
				userName={userName}
			/>

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
