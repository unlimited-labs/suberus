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
							data-testid="template-name-input"
							id="tpl-name"
							onChange={(e) => setName(e.target.value)}
							placeholder="e.g. Visa invitation letter"
							value={name}
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="tpl-desc">Description (optional)</Label>
						<Textarea
							id="tpl-desc"
							onChange={(e) => setDescription(e.target.value)}
							rows={2}
							value={description}
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="tpl-file">Template file (.docx)</Label>
						<Input
							accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
							data-testid="template-file-input"
							id="tpl-file"
							onChange={(e) => setFile(e.target.files?.[0] ?? null)}
							type="file"
						/>
					</div>

					<div className="bg-muted/40 rounded-xl border p-3">
						<p className="text-muted-foreground mb-2 text-xs font-medium">
							Supported placeholders — copy any into your .docx
						</p>
						<div className="flex flex-wrap gap-1">
							{DOCUMENT_PLACEHOLDERS.map((p) => (
								<Badge
									className="font-mono text-[10px]"
									key={p.key}
									title={p.label}
									variant="outline"
								>
									{`{${p.key}}`}
								</Badge>
							))}
						</div>
					</div>
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
						data-testid="template-upload-submit"
						disabled={busy || !file || !name.trim()}
						onClick={handleSubmit}
					>
						<IconUpload className="mr-2 size-4" />
						{busy ? "Uploading…" : "Upload"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
