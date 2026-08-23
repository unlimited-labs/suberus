import {
	IconDownload,
	IconPaperclip,
	IconTrash,
	IconUpload,
} from "@tabler/icons-react";
import { useRef, useState } from "react";
import type { CampaignAttachment } from "@/features/bulk-email/server/attachments";
import { EMAIL_ATTACHMENT_ACCEPT_ATTRIBUTE } from "@/features/settings/file-types";
import { cn, formatFileSize } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { useCampaignAttachments } from "./use-campaign-attachments";

interface AttachmentDropzoneProps {
	campaignId: string;
	attachments: CampaignAttachment[];
	disabled: boolean;
}

export function AttachmentDropzone({
	campaignId,
	attachments,
	disabled,
}: AttachmentDropzoneProps) {
	const { addFiles, remove, isUploading, removingId } =
		useCampaignAttachments(campaignId);
	const inputRef = useRef<HTMLInputElement>(null);
	const [dragging, setDragging] = useState(false);

	const handleFiles = (fileList: FileList | null) => {
		if (!fileList?.length) return;
		void addFiles(Array.from(fileList));
	};

	return (
		<div className="space-y-3">
			{!disabled && (
				// Drag target; the button inside provides the keyboard path.
				<div
					className={cn(
						"flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground transition-colors",
						dragging
							? "border-primary bg-primary/5"
							: "border-muted-foreground/25",
					)}
					data-testid="attachment-dropzone"
					onDragLeave={() => setDragging(false)}
					onDragOver={(e) => {
						e.preventDefault();
						setDragging(true);
					}}
					onDrop={(e) => {
						e.preventDefault();
						setDragging(false);
						handleFiles(e.dataTransfer.files);
					}}
				>
					<IconUpload className="size-6 opacity-60" />
					<p>Drag files here, or</p>
					<Button
						data-testid="attachment-browse-btn"
						disabled={isUploading}
						onClick={() => inputRef.current?.click()}
						size="sm"
						type="button"
						variant="outline"
					>
						{isUploading ? "Uploading…" : "Browse"}
					</Button>
					<input
						accept={EMAIL_ATTACHMENT_ACCEPT_ATTRIBUTE}
						className="hidden"
						multiple
						onChange={(e) => {
							handleFiles(e.target.files);
							e.target.value = "";
						}}
						ref={inputRef}
						type="file"
					/>
				</div>
			)}

			{attachments.length > 0 ? (
				<ul className="space-y-1.5" data-testid="attachment-list">
					{attachments.map((file) => (
						<li
							className="bg-muted/30 flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
							key={file.id}
						>
							<IconPaperclip className="size-4 shrink-0 opacity-60" />
							<span
								className="min-w-0 flex-1 truncate"
								title={file.originalName}
							>
								{file.originalName}
							</span>
							<span className="text-muted-foreground shrink-0 text-xs">
								{formatFileSize(file.size)}
							</span>
							<Button
								asChild
								className="size-7 shrink-0"
								size="icon"
								variant="ghost"
							>
								<a
									aria-label={`Download ${file.originalName}`}
									href={`/api/files/${file.id}`}
								>
									<IconDownload className="size-4" />
								</a>
							</Button>
							{!disabled && (
								<Button
									aria-label={`Remove ${file.originalName}`}
									className="text-destructive hover:bg-destructive/10 hover:text-destructive size-7 shrink-0"
									data-testid="attachment-remove-btn"
									disabled={removingId === file.id}
									onClick={() => remove(file.id)}
									size="icon"
									variant="ghost"
								>
									<IconTrash className="size-4" />
								</Button>
							)}
						</li>
					))}
				</ul>
			) : (
				disabled && (
					<p className="text-muted-foreground text-sm">No attachments.</p>
				)
			)}
		</div>
	);
}
