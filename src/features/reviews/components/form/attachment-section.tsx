import { IconFile, IconPaperclip, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { FILE_ACCEPT_ATTRIBUTE } from "@/features/settings/file-types";
import { FileDropzone } from "@/shared/components/file-dropzone";
import { formatFileSize } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

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
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-base">
					<IconPaperclip className="size-5 text-muted-foreground" />
					Attachment
					{!readOnly && (
						<Badge variant="outline" className="text-xs">
							Optional
						</Badge>
					)}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{readOnly ? (
					existingAttachment ? (
						<div className="flex items-center gap-3 p-4 rounded-lg border border-border bg-muted/30">
							<div className="flex-shrink-0 p-2 rounded bg-primary/10">
								<IconFile className="size-5 text-primary" />
							</div>
							<div className="flex-1 min-w-0">
								<a
									href={`/api/files/${existingAttachment.id}`}
									className="text-sm font-medium text-foreground hover:underline truncate block"
								>
									{existingAttachment.originalName}
								</a>
								<p className="text-xs text-muted-foreground">
									{formatFileSize(existingAttachment.size)}
								</p>
							</div>
						</div>
					) : (
						<p className="text-sm text-muted-foreground italic">
							No attachment
						</p>
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
										href={`/api/files/${existingAttachment.id}`}
										className="text-sm font-medium text-foreground hover:underline truncate block"
									>
										{existingAttachment.originalName}
									</a>
									<p className="text-xs text-muted-foreground">
										{formatFileSize(existingAttachment.size)}
									</p>
								</div>
								<Button
									type="button"
									size="icon-sm"
									variant="ghost"
									onClick={() => {
										setKeepExistingAttachment(false);
										onAttachmentChange?.(null);
									}}
									aria-label="Remove file"
								>
									<IconX className="size-4" />
								</Button>
							</div>
						) : (
							<FileDropzone
								value={attachmentFile}
								onChange={(file) => {
									setAttachmentFile(file);
									onAttachmentChange?.(file);
								}}
								accept={FILE_ACCEPT_ATTRIBUTE}
								maxSize={10}
							/>
						)}
					</>
				)}
			</CardContent>
		</Card>
	);
}
