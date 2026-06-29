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
				// biome-ignore lint/a11y/noStaticElementInteractions: drag target; the button inside provides the keyboard path.
				<div
					data-testid="attachment-dropzone"
					onDragOver={(e) => {
						e.preventDefault();
						setDragging(true);
					}}
					onDragLeave={() => setDragging(false)}
					onDrop={(e) => {
						e.preventDefault();
						setDragging(false);
						handleFiles(e.dataTransfer.files);
					}}
					className={cn(
						"flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground transition-colors",
						dragging
							? "border-primary bg-primary/5"
							: "border-muted-foreground/25",
					)}
				>
					<IconUpload className="size-6 opacity-60" />
					<p>Drag files here, or</p>
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={isUploading}
						onClick={() => inputRef.current?.click()}
						data-testid="attachment-browse-btn"
					>
						{isUploading ? "Uploading…" : "Browse"}
					</Button>
					<input
						ref={inputRef}
						type="file"
						multiple
						accept={EMAIL_ATTACHMENT_ACCEPT_ATTRIBUTE}
						className="hidden"
						onChange={(e) => {
							handleFiles(e.target.files);
							e.target.value = "";
						}}
					/>
				</div>
			)}

			{attachments.length > 0 ? (
				<ul className="space-y-1.5" data-testid="attachment-list">
					{attachments.map((file) => (
						<li
							key={file.id}
							className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm"
						>
							<IconPaperclip className="size-4 shrink-0 opacity-60" />
							<span
								className="min-w-0 flex-1 truncate"
								title={file.originalName}
							>
								{file.originalName}
							</span>
							<span className="shrink-0 text-xs text-muted-foreground">
								{formatFileSize(file.size)}
							</span>
							<Button
								asChild
								variant="ghost"
								size="icon"
								className="size-7 shrink-0"
							>
								<a
									href={`/api/files/${file.id}`}
									aria-label={`Download ${file.originalName}`}
								>
									<IconDownload className="size-4" />
								</a>
							</Button>
							{!disabled && (
								<Button
									variant="ghost"
									size="icon"
									className="size-7 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
									disabled={removingId === file.id}
									onClick={() => remove(file.id)}
									aria-label={`Remove ${file.originalName}`}
									data-testid="attachment-remove-btn"
								>
									<IconTrash className="size-4" />
								</Button>
							)}
						</li>
					))}
				</ul>
			) : (
				disabled && (
					<p className="text-sm text-muted-foreground">No attachments.</p>
				)
			)}
		</div>
	);
}
