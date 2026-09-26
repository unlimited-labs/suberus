import { IconCheck, IconFilePlus, IconUpload } from "@tabler/icons-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
	adminUserDocumentsQueryOptions,
	documentTemplatesQueryOptions,
	generateDocumentFn,
	previewResolutionQueryOptions,
	uploadDocumentFn,
} from "@/features/documents/api/documents";
import { NoTemplatesHint } from "@/features/documents/components/document-bits";
import {
	appendDelivery,
	DEFAULT_DELIVERY,
	DocumentDeliveryFields,
} from "@/features/documents/components/document-delivery-fields";
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
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";

interface UserDocumentDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	userId: string;
	userName: string;
}

const titleFromFileName = (name: string) => name.replace(/\.pdf$/i, "").trim();

export function UserDocumentDialog({
	open,
	onOpenChange,
	userId,
	userName,
}: UserDocumentDialogProps) {
	const queryClient = useQueryClient();
	const [mode, setMode] = useState("template");
	const [templateId, setTemplateId] = useState<string | null>(null);
	const [file, setFile] = useState<File | null>(null);
	const [title, setTitle] = useState("");
	const [delivery, setDelivery] = useState(DEFAULT_DELIVERY);
	const [busy, setBusy] = useState(false);

	const { data: templates = [] } = useQuery(documentTemplatesQueryOptions());
	const { data: preview, isFetching: previewLoading } = useQuery(
		previewResolutionQueryOptions(userId, templateId),
	);

	const missing = preview?.missing ?? [];
	const canGenerate =
		Boolean(templateId) && !previewLoading && missing.length === 0;
	const canUpload = Boolean(file) && title.trim() !== "";

	const reset = () => {
		setTemplateId(null);
		setFile(null);
		setTitle("");
		setDelivery(DEFAULT_DELIVERY);
	};

	const finish = async (message: string) => {
		await queryClient.invalidateQueries({
			queryKey: adminUserDocumentsQueryOptions(userId).queryKey,
		});
		toast.success(message);
		reset();
		onOpenChange(false);
	};

	const handleGenerate = async () => {
		if (!templateId) return;
		setBusy(true);
		try {
			await generateDocumentFn({ data: { userId, templateId } });
			await finish("Document is being generated");
		} catch (error) {
			toast.error(getErrorMessage(error, "Failed to generate document"));
		}
		setBusy(false);
	};

	const handleUpload = async () => {
		if (!file || !title.trim()) return;
		setBusy(true);
		try {
			const form = new FormData();
			form.set("file", file);
			form.set("userId", userId);
			form.set("title", title.trim());
			appendDelivery(form, delivery);
			await uploadDocumentFn({ data: form });
			await finish("Document uploaded");
		} catch (error) {
			toast.error(getErrorMessage(error, "Failed to upload document"));
		}
		setBusy(false);
	};

	return (
		<Dialog
			onOpenChange={(o) => {
				if (busy) return;
				if (!o) reset();
				onOpenChange(o);
			}}
			open={open}
		>
			<DialogContent className="sm:max-w-xl">
				<DialogHeader>
					<DialogTitle>Add document for {userName}</DialogTitle>
					<DialogDescription>
						Generate one from a template, or attach a PDF made elsewhere.
					</DialogDescription>
				</DialogHeader>

				<Tabs onValueChange={setMode} value={mode}>
					<TabsList className="w-full justify-start" variant="line">
						<TabsTrigger data-testid="document-mode-template" value="template">
							From template
						</TabsTrigger>
						<TabsTrigger data-testid="document-mode-upload" value="upload">
							Upload a PDF
						</TabsTrigger>
					</TabsList>

					<TabsContent className="space-y-4 py-2" value="template">
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

						{templateId && preview && (
							<ResolutionPreviewCard preview={preview} />
						)}
					</TabsContent>

					<TabsContent className="space-y-4 py-2" value="upload">
						<div className="space-y-1.5">
							<Label htmlFor="doc-file">PDF file</Label>
							<Input
								accept="application/pdf,.pdf"
								data-testid="document-file-input"
								id="doc-file"
								onChange={(e) => {
									const picked = e.target.files?.[0] ?? null;
									setFile(picked);
									if (picked && !title.trim()) {
										setTitle(titleFromFileName(picked.name));
									}
								}}
								type="file"
							/>
						</div>

						<div className="space-y-1.5">
							<Label htmlFor="doc-title">Title</Label>
							<Input
								data-testid="document-title-input"
								id="doc-title"
								onChange={(e) => setTitle(e.target.value)}
								placeholder="e.g. Invoice FV-2026-014"
								value={title}
							/>
						</div>

						<DocumentDeliveryFields
							idPrefix="doc"
							onChange={setDelivery}
							value={delivery}
						/>
					</TabsContent>
				</Tabs>

				<DialogFooter>
					<Button
						disabled={busy}
						onClick={() => onOpenChange(false)}
						variant="outline"
					>
						Cancel
					</Button>
					{mode === "template" ? (
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
					) : (
						<Button
							data-testid="upload-document-button"
							disabled={!canUpload || busy}
							onClick={handleUpload}
						>
							<IconUpload className="mr-2 size-4" />
							{busy ? "Uploading…" : "Upload"}
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
