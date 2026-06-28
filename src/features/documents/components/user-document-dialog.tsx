import {
	IconAlertTriangle,
	IconCheck,
	IconCircleCheck,
	IconFilePlus,
} from "@tabler/icons-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
	adminUserDocumentsQueryOptions,
	documentTemplatesQueryOptions,
	generateDocumentFn,
	previewResolutionQueryOptions,
} from "@/features/documents/api/documents";
import {
	NoTemplatesHint,
	placeholderLabel,
} from "@/features/documents/components/document-bits";
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
		} finally {
			setBusy(false);
		}
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(o) => {
				if (busy) return;
				if (!o) setTemplateId(null);
				onOpenChange(o);
			}}
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
						<Select value={templateId ?? ""} onValueChange={setTemplateId}>
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

					{templateId && preview && (
						<div className="overflow-hidden rounded-xl border">
							<div className="flex items-center justify-between border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
								<span>Resolved data</span>
								{missing.length > 0 && (
									<span className="flex items-center gap-1 text-destructive">
										<IconAlertTriangle className="size-3.5" />
										{missing.length} missing
									</span>
								)}
							</div>
							<div className="divide-y">
								{preview.placeholders.length === 0 && (
									<p className="px-3 py-2 text-sm text-muted-foreground">
										This template has no placeholders.
									</p>
								)}
								{preview.placeholders.map((p) => {
									const value = preview.values[p] ?? "";
									const isMissing = missing.includes(p);
									return (
										<div
											key={p}
											className="flex items-start justify-between gap-3 px-3 py-2"
											data-testid="resolution-row"
										>
											<span className="text-xs font-medium text-muted-foreground">
												{placeholderLabel(p)}
											</span>
											{isMissing ? (
												<span className="flex items-center gap-1 text-xs font-medium text-destructive">
													<IconAlertTriangle className="size-3.5" />
													Missing
												</span>
											) : (
												<span className="flex max-w-[60%] items-center gap-1.5 truncate text-right text-xs">
													<IconCircleCheck className="size-3.5 shrink-0 text-emerald-500" />
													<span className="truncate">{value}</span>
												</span>
											)}
										</div>
									);
								})}
							</div>
						</div>
					)}

					{templateId && missing.length > 0 && (
						<p
							className="flex items-center gap-1.5 text-xs text-destructive"
							role="alert"
						>
							<IconAlertTriangle className="size-3.5" />
							Cannot generate — missing:{" "}
							{missing.map(placeholderLabel).join(", ")}.
						</p>
					)}
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={busy}
					>
						Cancel
					</Button>
					<Button
						onClick={handleGenerate}
						disabled={!canGenerate || busy}
						data-testid="generate-document-button"
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
