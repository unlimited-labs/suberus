import { IconCheck, IconFilePlus } from "@tabler/icons-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
	adminUserDocumentsQueryOptions,
	documentTemplatesQueryOptions,
	generateDocumentFn,
	previewResolutionQueryOptions,
} from "@/features/documents/api/documents";
import { NoTemplatesHint } from "@/features/documents/components/document-bits";
import { ResolutionPreviewCard } from "@/features/documents/components/resolution-preview-card";
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
import { Label } from "@/shared/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/ui/select";

interface UserDocumentDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	userId: string;
	userName: string;
}

export function UserDocumentDialog({
	open,
	onOpenChange,
	userId,
	userName,
}: UserDocumentDialogProps) {
	const queryClient = useQueryClient();
	const [templateId, setTemplateId] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	const { data: templates = [] } = useQuery(documentTemplatesQueryOptions());
	const { data: preview, isFetching: previewLoading } = useQuery(
		previewResolutionQueryOptions(userId, templateId),
	);

	const missing = preview?.missing ?? [];
	const canGenerate =
		Boolean(templateId) && !previewLoading && missing.length === 0;

	const handleGenerate = async () => {
		if (!templateId) return;
		setBusy(true);
		try {
			await generateDocumentFn({ data: { userId, templateId } });
			await queryClient.invalidateQueries({
				queryKey: adminUserDocumentsQueryOptions(userId).queryKey,
			});
			toast.success("Document is being generated");
			setTemplateId(null);
			onOpenChange(false);
		} catch (error) {
			toast.error(getErrorMessage(error, "Failed to generate document"));
		}
		setBusy(false);
	};

	return (
		<Dialog
			onOpenChange={(o) => {
				if (busy) return;
				if (!o) setTemplateId(null);
				onOpenChange(o);
			}}
			open={open}
		>
			<DialogContent className="sm:max-w-xl">
				<DialogHeader>
					<DialogTitle>Add document for {userName}</DialogTitle>
					<DialogDescription>
						Pick a template; the participant's data fills its placeholders.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-2">
					<div className="space-y-1.5">
						<Label>Template</Label>
						<Select
							items={templates.map((t) => ({ value: t.id, label: t.name }))}
							onValueChange={setTemplateId}
							value={templateId ?? ""}
						>
							<SelectTrigger data-testid="document-template-select">
								<SelectValue placeholder="Select a template…" />
							</SelectTrigger>
							<SelectContent>
								{templates.map((t) => (
									<SelectItem key={t.id} value={t.id}>
										{t.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{templates.length === 0 && <NoTemplatesHint />}
					</div>

					{templateId && preview && <ResolutionPreviewCard preview={preview} />}
				</div>

				<DialogFooter>
					<Button
						disabled={busy}
						onClick={() => onOpenChange(false)}
						variant="outline"
					>
						Cancel
					</Button>
					<Button
						data-testid="generate-document-button"
						disabled={!canGenerate || busy}
						onClick={handleGenerate}
					>
						{canGenerate ? (
							<IconCheck className="mr-2 size-4" />
						) : (
							<IconFilePlus className="mr-2 size-4" />
						)}
						{busy ? "Generating…" : "Generate"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
