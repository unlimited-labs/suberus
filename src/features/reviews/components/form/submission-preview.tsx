import { IconDownload, IconFile, IconStarFilled } from "@tabler/icons-react";
import type { ContentFormat } from "@/features/settings/types";
import type { SubmissionType } from "@/generated/prisma/enums";
import {
	affiliationDisplay,
	authorCardClassName,
	presenterBadgeClassName,
} from "@/shared/components/author-card-styles";
import { cn, formatFileSize } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";
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
		keywords?: string[];
		previousVersion?: {
			title: string;
			content: string;
			file?: SubmissionFile | null;
			keywords?: string[];
		} | null;
	};
	contentFormat?: ContentFormat;
	reviewMode: "OPEN" | "SINGLE_BLIND" | "DOUBLE_BLIND";
	assignmentId: string;
}

export function SubmissionPreview({
	submission,
	contentFormat,
	reviewMode,
	assignmentId,
}: SubmissionPreviewProps) {
	const previous = submission.previousVersion;
	const isDoubleBlind = reviewMode === "DOUBLE_BLIND";
	const isFileSubmission = contentFormat
		? contentFormat === "FILE"
		: !!submission.file;

	return (
		<>
			{isDoubleBlind ? (
				<Card>
					<CardContent className="py-4">
						<p className="text-muted-foreground text-sm italic">
							Double-blind review — author information hidden
						</p>
					</CardContent>
				</Card>
			) : (
				submission.authors.length > 0 && (
					<AuthorsCard authors={submission.authors} />
				)
			)}

			<ContentCard
				content={submission.content}
				file={submission.file}
				isFileSubmission={isFileSubmission}
			/>

			{previous && (
				<RevisionDiffPanel
					assignmentId={assignmentId}
					content={submission.content ?? ""}
					file={submission.file}
					isFileSubmission={isFileSubmission}
					keywords={submission.keywords ?? []}
					previous={previous}
					title={submission.title}
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
					<AuthorRow author={author} index={index} key={index} />
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
			className={cn(
				authorCardClassName({
					isPresenter: author.isPresenter,
					isDragging: false,
					isDragOverlay: false,
				}),
				"flex items-start gap-3 p-3",
			)}
			data-testid={`submission-author-${index}`}
		>
			<div className={presenterBadgeClassName(author.isPresenter)}>
				{index + 1}
			</div>
			<div className="min-w-0 flex-1">
				<div className="flex flex-wrap items-center gap-2">
					<span className="text-foreground font-medium">
						{author.firstName} {author.lastName}
					</span>
					{author.isPresenter && (
						<span className="text-primary inline-flex items-center gap-1 text-xs font-medium">
							<IconStarFilled className="size-3" />
							Presenter
						</span>
					)}
				</div>
				<p className="text-muted-foreground mt-0.5 truncate text-sm">
					{affiliationDisplay(author.affiliationName)}
				</p>
			</div>
		</div>
	);
}

function ContentCard({
	file,
	content,
	isFileSubmission,
}: {
	file?: SubmissionFile | null;
	content?: string;
	isFileSubmission: boolean;
}) {
	return (
		<SectionCard
			action={
				<Badge data-testid="submission-content-format" variant="secondary">
					{isFileSubmission ? "File submission" : "Text submission"}
				</Badge>
			}
			contentClassName="space-y-3"
			title="Submission Content"
		>
			{file && (
				<div className="border-border bg-muted/30 flex items-center gap-4 rounded-lg border p-3">
					<div className="bg-primary/10 shrink-0 rounded-md p-2">
						<IconFile className="text-primary size-5" />
					</div>
					<div className="min-w-0 flex-1">
						<p className="text-foreground truncate text-sm font-medium">
							{file.originalName}
						</p>
						<p className="text-muted-foreground text-xs">
							{formatFileSize(file.size)}
						</p>
					</div>
					<a
						className="border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium"
						data-testid="file-download-button"
						href={`/api/files/${file.id}`}
					>
						<IconDownload className="size-4" />
						Download
					</a>
				</div>
			)}
			{content && (
				<div className="border-border bg-muted/30 text-foreground max-h-96 overflow-auto rounded-lg border p-4 text-sm leading-relaxed break-words whitespace-pre-line">
					{content}
				</div>
			)}
		</SectionCard>
	);
}
