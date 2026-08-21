import { IconFileCertificate, IconPlus } from "@tabler/icons-react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
	deleteTemplateFn,
	documentTemplatesQueryOptions,
	uploadTemplateFn,
} from "@/features/documents/api/documents";
import { ConfirmDeleteDialog } from "@/features/documents/components/confirm-delete-dialog";
import { TemplateCard } from "@/features/documents/components/template-card";
import { TemplateUploadDialog } from "@/features/documents/components/template-upload-dialog";
import { getErrorMessage } from "@/shared/lib/error-message";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { SectionCard } from "@/shared/ui/section-card";

interface Template {
	id: string;
	name: string;
	description: string | null;
	placeholders: string[];
	createdAt: Date;
}

export function TemplatesTab() {
	const queryClient = useQueryClient();
	const { data: templates } = useSuspenseQuery(documentTemplatesQueryOptions());
	const [uploadOpen, setUploadOpen] = useState(false);
	const [deleting, setDeleting] = useState<Template | null>(null);
	const [busy, setBusy] = useState(false);

	const invalidate = () =>
		queryClient.invalidateQueries({
			queryKey: documentTemplatesQueryOptions().queryKey,
		});

	const handleUpload = async (
		file: File,
		name: string,
		description: string,
	) => {
		const fd = new FormData();
		fd.append("file", file);
		fd.append("name", name);
		if (description) fd.append("description", description);
		await uploadTemplateFn({ data: fd });
		await invalidate();
		toast.success("Template uploaded");
	};

	const handleDelete = async () => {
		if (!deleting) return;
		setBusy(true);
		try {
			await deleteTemplateFn({ data: { id: deleting.id } });
			await invalidate();
			setDeleting(null);
			toast.success("Template deleted");
		} catch (error) {
			toast.error(getErrorMessage(error, "Failed to delete template"));
		}
		setBusy(false);
	};

	return (
		<SectionCard
			action={
				<Button
					data-testid="upload-template-button"
					onClick={() => setUploadOpen(true)}
				>
					<IconPlus className="mr-2 size-4" />
					Upload template
				</Button>
			}
			description={
				<>
					Upload .docx templates with <code>{"{placeholder}"}</code> tokens the
					system fills with participant data.
				</>
			}
			icon={IconFileCertificate}
			title="Templates"
		>
			{templates.length === 0 ? (
				<EmptyState
					action={
						<Button onClick={() => setUploadOpen(true)}>
							<IconPlus className="mr-2 size-4" />
							Upload template
						</Button>
					}
					description="Upload a .docx with {placeholder} tokens to start issuing documents to participants."
					icon={IconFileCertificate}
					title="No templates yet"
				/>
			) : (
				<div className="space-y-2">
					{templates.map((t) => (
						<TemplateCard
							createdAt={t.createdAt}
							description={t.description}
							downloadHref={`/api/documents/templates/${t.id}`}
							key={t.id}
							name={t.name}
							onDelete={() => setDeleting(t)}
							placeholders={t.placeholders}
						/>
					))}
				</div>
			)}

			<TemplateUploadDialog
				onOpenChange={setUploadOpen}
				onUpload={handleUpload}
				open={uploadOpen}
			/>

			<ConfirmDeleteDialog
				busy={busy}
				description={`“${deleting?.name}” will be removed. Already-generated documents are kept.`}
				onConfirm={handleDelete}
				onOpenChange={(o) => {
					if (!o) setDeleting(null);
				}}
				open={deleting !== null}
				title="Delete template?"
			/>
		</SectionCard>
	);
}
