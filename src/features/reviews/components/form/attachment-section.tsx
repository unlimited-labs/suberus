import { IconFile, IconPaperclip, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { FILE_ACCEPT_ATTRIBUTE } from "@/features/settings/file-types";
import { FileDropzone } from "@/shared/components/file-dropzone";
import { formatFileSize } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { SectionCard } from "@/shared/ui/section-card";

interface AttachmentSectionProps {
	readOnly: boolean;
	onAttachmentChange?: (file: File | null) => void;
	existingAttachment?: {
		id: string;
		fileName: string;
		originalName: string;
		size: number;
	};
}

export function AttachmentSection({
	readOnly,
	onAttachmentChange,
	existingAttachment,
}: AttachmentSectionProps) {
	const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
	const [keepExistingAttachment, setKeepExistingAttachment] = useState(
		!!existingAttachment,
	);

	return (
		<SectionCard
			action={
				!readOnly && (
					<Badge className="text-xs" variant="outline">
						Optional
					</Badge>
				)
			}
			contentClassName="space-y-4"
			icon={IconPaperclip}
			title="Attachment"
		>
			{readOnly ? (
				existingAttachment ? (
					<div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-muted/30">
						<div className="flex-shrink-0 p-2 rounded bg-primary/10">
							<IconFile className="size-5 text-primary" />
						</div>
						<div className="flex-1 min-w-0">
							<a
								className="text-sm font-medium text-foreground hover:underline truncate block"
								href={`/api/files/${existingAttachment.id}`}
							>
								{existingAttachment.originalName}
							</a>
							<p className="text-xs text-muted-foreground">
								{formatFileSize(existingAttachment.size)}
							</p>
						</div>
					</div>
				) : (
					<p className="text-sm text-muted-foreground italic">No attachment</p>
				)
			) : (
				<>
					<p className="text-sm text-muted-foreground">
						Upload a PDF or DOCX file with detailed review notes
					</p>
					{existingAttachment && keepExistingAttachment ? (
						<div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-muted/30">
							<div className="flex-shrink-0 p-2 rounded bg-primary/10">
								<IconFile className="size-5 text-primary" />
							</div>
							<div className="flex-1 min-w-0">
								<a
									className="text-sm font-medium text-foreground hover:underline truncate block"
									href={`/api/files/${existingAttachment.id}`}
								>
									{existingAttachment.originalName}
								</a>
								<p className="text-xs text-muted-foreground">
									{formatFileSize(existingAttachment.size)}
								</p>
							</div>
							<Button
								aria-label="Remove file"
								onClick={() => {
									setKeepExistingAttachment(false);
									onAttachmentChange?.(null);
								}}
								size="icon-sm"
								type="button"
								variant="ghost"
							>
								<IconX className="size-4" />
							</Button>
						</div>
					) : (
						<FileDropzone
							accept={FILE_ACCEPT_ATTRIBUTE}
							maxSize={10}
							onChange={(file) => {
								setAttachmentFile(file);
								onAttachmentChange?.(file);
							}}
							value={attachmentFile}
						/>
					)}
				</>
			)}
		</SectionCard>
	);
}
