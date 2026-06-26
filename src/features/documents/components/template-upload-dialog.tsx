import { IconUpload } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";
import { DOCUMENT_PLACEHOLDERS } from "@/features/documents/lib/placeholders";
import { getErrorMessage } from "@/shared/lib/error-message";
import { Badge } from "@/shared/ui/badge";
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
import { Textarea } from "@/shared/ui/textarea";

interface TemplateUploadDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onUpload: (file: File, name: string, description: string) => Promise<void>;
}

export function TemplateUploadDialog({
	open,
	onOpenChange,
	onUpload,
}: TemplateUploadDialogProps) {
	const [file, setFile] = useState<File | null>(null);
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [busy, setBusy] = useState(false);

	const reset = () => {
		setFile(null);
		setName("");
		setDescription("");
	};

	const handleSubmit = async () => {
		if (!file || !name.trim()) return;
		setBusy(true);
		try {
			await onUpload(file, name.trim(), description.trim());
			reset();
			onOpenChange(false);
		} catch (error) {
			toast.error(getErrorMessage(error, "Failed to upload template"));
		} finally {
			setBusy(false);
		}
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(o) => {
				if (busy) return;
				if (!o) reset();
				onOpenChange(o);
			}}
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Upload document template</DialogTitle>
					<DialogDescription>
						A .docx file with <code>{"{placeholder}"}</code> tokens the system
						fills with participant data.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-2">
					<div className="space-y-1.5">
						<Label htmlFor="tpl-name">Name</Label>
						<Input
							id="tpl-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="e.g. Visa invitation letter"
							data-testid="template-name-input"
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="tpl-desc">Description (optional)</Label>
						<Textarea
							id="tpl-desc"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							rows={2}
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="tpl-file">Template file (.docx)</Label>
						<Input
							id="tpl-file"
							type="file"
							accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
							onChange={(e) => setFile(e.target.files?.[0] ?? null)}
							data-testid="template-file-input"
						/>
					</div>

					<div className="rounded-md border bg-muted/40 p-3">
						<p className="mb-2 text-xs font-medium text-muted-foreground">
							Supported placeholders
						</p>
						<div className="flex flex-wrap gap-1">
							{DOCUMENT_PLACEHOLDERS.map((p) => (
								<Badge
									key={p.key}
									variant="outline"
									className="font-mono text-[10px]"
									title={p.label}
								>
									{`{${p.key}}`}
								</Badge>
							))}
						</div>
					</div>
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
						onClick={handleSubmit}
						disabled={busy || !file || !name.trim()}
						data-testid="template-upload-submit"
					>
						<IconUpload className="mr-2 size-4" />
						{busy ? "Uploading…" : "Upload"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
