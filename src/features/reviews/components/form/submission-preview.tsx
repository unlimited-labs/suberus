import {
	IconChevronDown,
	IconChevronUp,
	IconDownload,
	IconFile,
	IconFileText,
	IconGitCompare,
	IconStarFilled,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import type { SubmissionType } from "@/generated/prisma/enums";
import { typeLabels } from "@/shared/lib/labels/submission";
import { cn, formatFileSize } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { RevisionDiffPanel } from "./revision-diff-panel";

interface SubmissionAuthor {
	firstName: string;
	lastName: string;
	affiliationName: string | null;
	isPresenter: boolean;
}

interface SubmissionPreviewProps {
	submission: {
		title: string;
		type: SubmissionType | string;
		authors: SubmissionAuthor[];
		content?: string;
		file?: {
			id: string;
			fileName: string;
			originalName: string;
			mimeType: string;
			size: number;
		} | null;
		previousVersion?: { title: string; content: string } | null;
	};
	reviewMode: "OPEN" | "SINGLE_BLIND" | "DOUBLE_BLIND";
	assignmentId: string;
}

export function SubmissionPreview({
	submission,
	reviewMode,
	assignmentId,
}: SubmissionPreviewProps) {
	const [contentExpanded, setContentExpanded] = useState(false);
	const previous = submission.previousVersion;

	return (
		<>
			{/* Header */}
			<div className="mb-8 space-y-4">
				<div>
					<div className="flex items-center gap-2 mb-2">
						<Badge variant="outline" className="text-xs">
							{typeLabels[submission.type as SubmissionType] ?? submission.type}
						</Badge>
					</div>
					<h1 className="text-2xl font-semibold tracking-tight text-foreground">
						{submission.title}
					</h1>
				</div>

				{/* Authors - only show if not double-blind */}
				{reviewMode !== "DOUBLE_BLIND" && submission.authors.length > 0 && (
					<div className="space-y-2">
						<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
							Authors
						</p>
						<div className="flex flex-wrap gap-2">
							{submission.authors.map((author, index) => (
								<div
									key={index}
									className={cn(
										"flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm",
										author.isPresenter
											? "border-primary/30 bg-primary/5"
											: "border-border bg-muted/30",
									)}
								>
									{author.isPresenter && (
										<IconStarFilled className="size-3 text-primary" />
									)}
									<span className="text-foreground">
										{author.firstName} {author.lastName}
									</span>
								</div>
							))}
						</div>
					</div>
				)}

				{reviewMode === "DOUBLE_BLIND" && (
					<div className="rounded-lg border border-border/50 bg-muted/30 p-3">
						<p className="text-sm text-muted-foreground italic">
							Double-blind review - author information hidden
						</p>
					</div>
				)}
			</div>

			{/* Changes since previous version (round-over-round revision diff) */}
			{previous && (
				<div className="mb-6 space-y-3">
					<div className="flex justify-end">
						<Button asChild variant="outline" size="sm" className="gap-2">
							<Link
								to="/reviews/$assignmentId/compare"
								params={{ assignmentId }}
								data-testid="reviewer-compare-link"
							>
								<IconGitCompare className="size-4" />
								Compare versions
							</Link>
						</Button>
					</div>
					<RevisionDiffPanel
						previous={previous}
						title={submission.title}
						content={submission.content ?? ""}
					/>
				</div>
			)}

			{/* Submission Content Section */}
			{(submission.content || submission.file) && (
				<div className="border rounded-lg overflow-hidden">
					<button
						type="button"
						onClick={() => setContentExpanded(!contentExpanded)}
						className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
					>
						<div className="flex items-center gap-2">
							<IconFileText className="size-5 text-muted-foreground" />
							<span className="font-medium text-sm text-foreground">
								Submission Content
							</span>
						</div>
						{contentExpanded ? (
							<IconChevronUp className="size-4 text-muted-foreground" />
						) : (
							<IconChevronDown className="size-4 text-muted-foreground" />
						)}
					</button>
					{contentExpanded && (
						<div className="px-4 pb-4 space-y-3">
							{submission.file && (
								<div className="flex items-center gap-4 p-3 rounded-lg border bg-muted/30">
									<div className="flex-shrink-0 p-2 rounded-md bg-primary/10">
										<IconFile className="size-5 text-primary" />
									</div>
									<div className="flex-1 min-w-0">
										<p className="text-sm font-medium text-foreground truncate">
											{submission.file.originalName}
										</p>
										<p className="text-xs text-muted-foreground">
											{formatFileSize(submission.file.size)}
										</p>
									</div>
									<a
										href={`/api/files/${submission.file.id}`}
										data-testid="file-download-button"
										className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground"
									>
										<IconDownload className="size-4" />
										Download
									</a>
								</div>
							)}
							{submission.content && (
								<div className="text-sm text-foreground leading-relaxed whitespace-pre-line break-words bg-muted/30 p-4 rounded-lg border max-h-96 overflow-auto">
									{submission.content}
								</div>
							)}
						</div>
					)}
				</div>
			)}
		</>
	);
}
