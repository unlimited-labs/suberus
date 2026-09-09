import { IconUpload } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
	documentKeys,
	importDocumentsZipFn,
} from "@/features/documents/api/documents";
import { DocumentDeliveryFields } from "@/features/documents/components/document-delivery-fields";
import type {
	ImportDocumentsResult,
	ImportSkipReason,
} from "@/features/documents/server/bulk-upload";
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

const SKIP_REASONS = {
	"no-user-id": "name is not a participant ID",
	"unknown-user": "no such participant",
	"invalid-file": "not a valid PDF",
	"too-large": "file is too large",
	failed: "could not be stored",
} satisfies Record<ImportSkipReason, string>;

interface ImportDocumentsDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function ImportDocumentsDialog({
	open,
	onOpenChange,
}: ImportDocumentsDialogProps) {
	const queryClient = useQueryClient();
	const [file, setFile] = useState<File | null>(null);
	const [title, setTitle] = useState("");
	const [sign, setSign] = useState(true);
	const [notify, setNotify] = useState(true);
	const [busy, setBusy] = useState(false);
	const [result, setResult] = useState<ImportDocumentsResult | null>(null);

	const reset = () => {
		setFile(null);
		setTitle("");
		setSign(true);
		setNotify(true);
		setResult(null);
	};

	const handleImport = async () => {
		if (!file || !title.trim()) return;
		setBusy(true);
		try {
			const form = new FormData();
			form.set("file", file);
			form.set("title", title.trim());
			form.set("sign", String(sign));
			form.set("notify", String(notify));
			const imported = await importDocumentsZipFn({ data: form });
			await queryClient.invalidateQueries({ queryKey: documentKeys.all });
			setResult(imported);
			setFile(null);
			setTitle("");
			toast.success(`${imported.uploaded} document(s) imported`);
		} catch (error) {
			toast.error(getErrorMessage(error, "Failed to import documents"));
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
					<DialogTitle>Import documents from a ZIP</DialogTitle>
					<DialogDescription>
						One PDF per participant, each named after their participant ID —{" "}
						<code>3f2a1c4e-….pdf</code>. Every document in the archive gets the
						same title.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-2">
					<div className="space-y-1.5">
						<Label htmlFor="import-file">ZIP archive</Label>
						<Input
							accept="application/zip,.zip"
							data-testid="import-zip-input"
							id="import-file"
							onChange={(e) => setFile(e.target.files?.[0] ?? null)}
							type="file"
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="import-title">Title for every document</Label>
						<Input
							data-testid="import-title-input"
							id="import-title"
							onChange={(e) => setTitle(e.target.value)}
							placeholder="e.g. Certificate of attendance"
							value={title}
						/>
					</div>

					<DocumentDeliveryFields
						idPrefix="import"
						notify={notify}
						onNotifyChange={setNotify}
						onSignChange={setSign}
						sign={sign}
					/>

					{result && (
						<div
							className="bg-muted/40 space-y-2 rounded-xl border p-3 text-sm"
							data-testid="import-result"
						>
							<p className="font-medium">
								{result.uploaded} imported, {result.skipped.length} skipped
							</p>
							{result.skipped.length > 0 && (
								<ul className="text-muted-foreground space-y-1 text-xs">
									{result.skipped.map((s) => (
										<li key={s.name}>
											<span className="font-mono">{s.name}</span> —{" "}
											{s.error ?? SKIP_REASONS[s.reason]}
										</li>
									))}
								</ul>
							)}
						</div>
					)}
				</div>

				<DialogFooter>
					<Button
						disabled={busy}
						onClick={() => onOpenChange(false)}
						variant="outline"
					>
						{result ? "Close" : "Cancel"}
					</Button>
					<Button
						data-testid="import-documents-button"
						disabled={busy || !file || title.trim() === ""}
						onClick={handleImport}
					>
						<IconUpload className="mr-2 size-4" />
						{busy ? "Importing…" : "Import"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
