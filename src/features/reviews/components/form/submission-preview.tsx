import { IconDownload, IconFile, IconStarFilled } from "@tabler/icons-react";
import type { SubmissionType } from "@/generated/prisma/enums";
import {
	affiliationDisplay,
	authorCardClassName,
	presenterBadgeClassName,
} from "@/shared/components/author-card-styles";
import { cn, formatFileSize } from "@/shared/lib/utils";
import { Card, CardContent } from "@/shared/ui/card";
import { SectionCard } from "@/shared/ui/section-card";
import { RevisionDiffPanel } from "./revision-diff-panel";

interface SubmissionAuthor {
	firstName: string;
	lastName: string;
	affiliationName: string | null;
	isPresenter: boolean;
}

interface SubmissionFile {
	id: string;
	fileName: string;
	originalName: string;
	mimeType: string;
	size: number;
}

interface SubmissionPreviewProps {
	submission: {
		title: string;
		type: SubmissionType | string;
		authors: SubmissionAuthor[];
		content?: string;
		file?: SubmissionFile | null;
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
	const previous = submission.previousVersion;
	const isDoubleBlind = reviewMode === "DOUBLE_BLIND";

	return (
		<>
			{isDoubleBlind ? (
				<Card>
					<CardContent className="py-4">
						<p className="text-sm italic text-muted-foreground">
							Double-blind review — author information hidden
						</p>
					</CardContent>
				</Card>
			) : (
				submission.authors.length > 0 && (
					<AuthorsCard authors={submission.authors} />
				)
			)}

			<ContentCard file={submission.file} content={submission.content} />

			{previous && (
				<RevisionDiffPanel
					previous={previous}
					title={submission.title}
					content={submission.content ?? ""}
					assignmentId={assignmentId}
				/>
			)}
		</>
	);
}

function AuthorsCard({ authors }: { authors: SubmissionAuthor[] }) {
	return (
		<SectionCard title="Authors">
			<div
				className={cn(
					"grid grid-cols-1 gap-2",
					authors.length > 1 && "sm:grid-cols-2",
				)}
			>
				{authors.map((author, index) => (
					<AuthorRow key={index} author={author} index={index} />
				))}
			</div>
		</SectionCard>
	);
}

function AuthorRow({
	author,
	index,
}: {
	author: SubmissionAuthor;
	index: number;
}) {
	return (
		<div
			data-testid={`submission-author-${index}`}
			className={cn(
				authorCardClassName({
					isPresenter: author.isPresenter,
					isDragging: false,
					isDragOverlay: false,
				}),
				"flex items-start gap-3 p-3",
			)}
		>
			<div className={presenterBadgeClassName(author.isPresenter)}>
				{index + 1}
			</div>
			<div className="min-w-0 flex-1">
				<div className="flex flex-wrap items-center gap-2">
					<span className="font-medium text-foreground">
						{author.firstName} {author.lastName}
					</span>
					{author.isPresenter && (
						<span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
							<IconStarFilled className="size-3" />
							Presenter
						</span>
					)}
				</div>
				<p className="mt-0.5 truncate text-sm text-muted-foreground">
					{affiliationDisplay(author.affiliationName)}
				</p>
			</div>
		</div>
	);
}

function ContentCard({
	file,
	content,
}: {
	file?: SubmissionFile | null;
	content?: string;
}) {
	return (
		<SectionCard title="Submission Content" contentClassName="space-y-3">
			{file && (
				<div className="flex items-center gap-4 rounded-lg border border-border bg-muted/30 p-3">
					<div className="shrink-0 rounded-md bg-primary/10 p-2">
						<IconFile className="size-5 text-primary" />
					</div>
					<div className="min-w-0 flex-1">
						<p className="truncate text-sm font-medium text-foreground">
							{file.originalName}
						</p>
						<p className="text-xs text-muted-foreground">
							{formatFileSize(file.size)}
						</p>
					</div>
					<a
						href={`/api/files/${file.id}`}
						data-testid="file-download-button"
						className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
					>
						<IconDownload className="size-4" />
						Download
					</a>
				</div>
			)}
			{content && (
				<div className="max-h-96 overflow-auto whitespace-pre-line break-words rounded-lg border border-border bg-muted/30 p-4 text-sm leading-relaxed text-foreground">
					{content}
				</div>
			)}
		</SectionCard>
	);
}
