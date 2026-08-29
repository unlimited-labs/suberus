import {
	IconDownload,
	IconFile,
	IconGitCompare,
	IconStarFilled,
	IconUserCircle,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { VersionSelector } from "@/features/submissions/components/version-selector";
import { cn, formatFileSize } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { SectionCard } from "@/shared/ui/section-card";
import {
	type EditorAuthor,
	type EditorSubmission,
	type EditorVersion,
	resolveDisplayedVersion,
} from "./availability";

interface ContentTabProps {
	submissionId: string;
	authors: EditorAuthor[];
	versions: EditorVersion[];
	submission: Pick<
		EditorSubmission,
		"currentVersionNumber" | "content" | "acknowledgment" | "file"
	>;
}

export function ContentTab({
	submissionId,
	authors,
	versions,
	submission,
}: ContentTabProps) {
	const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
	const {
		effectiveVersion,
		content: displayedContent,
		file: displayedFile,
	} = resolveDisplayedVersion(versions, selectedVersion, submission);

	return (
		<>
			<SectionCard title="Authors">
				<div
					className={cn(
						"grid grid-cols-1 gap-2",
						authors.length > 1 && "sm:grid-cols-2",
					)}
				>
					{authors.map((author, index) => (
						<div
							className={cn(
								"flex items-start gap-3 rounded-lg border p-3 transition-colors",
								author.isPresenter
									? "border-primary/30 bg-primary/5"
									: "border-border/50 bg-muted/30",
							)}
							data-testid={`submission-author-${index}`}
							key={author.email}
						>
							<div
								className={cn(
									"flex size-8 shrink-0 items-center justify-center rounded-md text-sm font-semibold",
									author.isPresenter
										? "bg-primary/10 text-primary"
										: "bg-muted text-muted-foreground",
								)}
							>
								{index + 1}
							</div>
							<div className="min-w-0 flex-1">
								<div className="flex flex-wrap items-center gap-2">
									{author.userId ? (
										<Link
											className="text-foreground hover:text-primary flex items-center gap-1 font-medium hover:underline"
											data-testid={`author-profile-link-${index}`}
											params={{ id: author.userId }}
											to="/admin/users/$id"
										>
											{author.firstName} {author.lastName}
											<IconUserCircle className="text-muted-foreground size-4" />
										</Link>
									) : (
										<span className="text-foreground font-medium">
											{author.firstName} {author.lastName}
										</span>
									)}
									{author.isPresenter && (
										<Badge
											className="border-primary/20 bg-primary/10 text-primary gap-1 text-xs"
											variant="secondary"
										>
											<IconStarFilled className="size-3" />
											Presenter
										</Badge>
									)}
								</div>
								<p className="text-muted-foreground mt-0.5 truncate text-sm">
									{author.affiliationName ?? (
										<span className="italic opacity-70">No affiliation</span>
									)}
								</p>
								<p className="text-muted-foreground/70 truncate text-xs">
									{author.email}
								</p>
							</div>
						</div>
					))}
				</div>
			</SectionCard>

			<SectionCard
				action={
					versions.length > 1 ? (
						<div className="flex items-end gap-2">
							<Button asChild className="gap-2" size="sm" variant="outline">
								<Link
									params={{ id: submissionId }}
									to="/admin/submissions/$id/compare"
								>
									<IconGitCompare className="size-4" />
									Compare versions
								</Link>
							</Button>
							<div className="w-44">
								<VersionSelector
									currentVersion={submission.currentVersionNumber}
									onVersionChange={setSelectedVersion}
									selectedVersion={effectiveVersion}
									versions={versions}
								/>
							</div>
						</div>
					) : undefined
				}
				title="Content"
			>
				{displayedFile ? (
					<div className="bg-muted/30 flex items-center gap-4 rounded-lg border p-4">
						<div className="bg-primary/10 shrink-0 rounded-md p-2">
							<IconFile className="text-primary size-6" />
						</div>
						<div className="min-w-0 flex-1">
							<p className="text-foreground truncate text-sm font-medium">
								{displayedFile.originalName}
							</p>
							<p className="text-muted-foreground text-xs">
								{formatFileSize(displayedFile.size)}
							</p>
						</div>
						<a
							className="border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium"
							data-testid="file-download-button"
							href={`/api/files/${displayedFile.id}`}
						>
							<IconDownload className="size-4" />
							Download
						</a>
					</div>
				) : (
					<div className="prose prose-sm dark:prose-invert max-w-none">
						{displayedContent.split(/\n{2,}/).map((para, i) => (
							<p className="wrap-break-word whitespace-pre-wrap" key={i}>
								{para}
							</p>
						))}
					</div>
				)}
				{submission.acknowledgment && (
					<div className="mt-4 space-y-2 border-t pt-4">
						<p className="text-muted-foreground text-sm font-medium">
							Acknowledgment
						</p>
						<p className="wrap-break-word whitespace-pre-line">
							{submission.acknowledgment}
						</p>
					</div>
				)}
			</SectionCard>
		</>
	);
}
