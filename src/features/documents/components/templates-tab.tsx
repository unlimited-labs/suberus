import {
	IconDownload,
	IconFileCertificate,
	IconPlus,
	IconTrash,
} from "@tabler/icons-react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
	deleteTemplateFn,
	documentTemplatesQueryOptions,
	uploadTemplateFn,
} from "@/features/documents/api/documents";
import { PlaceholderChips } from "@/features/documents/components/document-bits";
import { TemplateUploadDialog } from "@/features/documents/components/template-upload-dialog";
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
	const { formatDate } = useDateFormat();
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
		} finally {
			setBusy(false);
		}
	};

	return (
		<SectionCard
			icon={IconFileCertificate}
			title="Templates"
			description={
				<>
					Upload .docx templates with <code>{"{placeholder}"}</code> tokens the
					system fills with participant data.
				</>
			}
			action={
				<Button
					onClick={() => setUploadOpen(true)}
					data-testid="upload-template-button"
				>
					<IconPlus className="mr-2 size-4" />
					Upload template
				</Button>
			}
		>
			{templates.length === 0 ? (
				<div className="rounded-lg border border-dashed p-10 text-center">
					<IconFileCertificate className="mx-auto size-8 text-muted-foreground" />
					<p className="mt-2 text-sm text-muted-foreground">
						No templates yet. Upload a .docx to get started.
					</p>
				</div>
			) : (
				<div className="space-y-2">
					{templates.map((t) => (
						<div
							key={t.id}
							data-testid="template-row"
							className="flex flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:items-center"
						>
							<div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
								<IconFileCertificate className="size-5" />
							</div>
							<div className="min-w-0 flex-1">
								<p className="truncate text-sm font-medium">{t.name}</p>
								{t.description && (
									<p className="truncate text-xs text-muted-foreground">
										{t.description}
									</p>
								)}
								<div className="mt-1.5">
									<PlaceholderChips placeholders={t.placeholders} />
								</div>
							</div>
							<span className="shrink-0 text-xs text-muted-foreground">
								{formatDate(t.createdAt)}
							</span>
							<div className="flex shrink-0 items-center gap-1">
								<Button
									asChild
									variant="ghost"
									size="icon-sm"
									aria-label="Download original"
								>
									<a href={`/api/documents/templates/${t.id}`}>
										<IconDownload className="size-4" />
									</a>
								</Button>
								<Button
									variant="ghost"
									size="icon-sm"
									onClick={() => setDeleting(t)}
									className="text-destructive hover:text-destructive"
									aria-label="Delete template"
								>
									<IconTrash className="size-4" />
								</Button>
							</div>
						</div>
					))}
				</div>
			)}

			<TemplateUploadDialog
				open={uploadOpen}
				onOpenChange={setUploadOpen}
				onUpload={handleUpload}
			/>

			<Dialog
				open={deleting !== null}
				onOpenChange={(o) => {
					if (!o && !busy) setDeleting(null);
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete template?</DialogTitle>
						<DialogDescription>
							“{deleting?.name}” will be removed. Already-generated documents
							are kept.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setDeleting(null)}
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
