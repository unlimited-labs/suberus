import {
	IconDownload,
	IconFile,
	IconStarFilled,
	IconUserCircle,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VersionSelector } from "@/features/submissions/components/version-selector";
import { cn, formatFileSize } from "@/lib/utils";

import {
	type EditorAuthor,
	type EditorSubmission,
	type EditorVersion,
	resolveDisplayedVersion,
} from "./availability";

interface ContentTabProps {
	authors: EditorAuthor[];
	versions: EditorVersion[];
	submission: Pick<
		EditorSubmission,
		"currentVersionNumber" | "content" | "file"
	>;
}

export function ContentTab({ authors, versions, submission }: ContentTabProps) {
	const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
	const {
		effectiveVersion,
		content: displayedContent,
		file: displayedFile,
	} = resolveDisplayedVersion(versions, selectedVersion, submission);

	return (
		<>
			<Card>
				<CardHeader>
					<CardTitle className="text-base">Authors</CardTitle>
				</CardHeader>
				<CardContent>
					<div
						className={cn(
							"grid grid-cols-1 gap-2",
							authors.length > 1 && "sm:grid-cols-2",
						)}
					>
						{authors.map((author, index) => (
							<div
								key={`${author.email}-${index}`}
								data-testid={`submission-author-${index}`}
								className={cn(
									"flex items-start gap-3 rounded-lg border p-3 transition-colors",
									author.isPresenter
										? "border-primary/30 bg-primary/5"
										: "border-border/50 bg-muted/30",
								)}
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
												to="/admin/users/$id"
												params={{ id: author.userId }}
												data-testid={`author-profile-link-${index}`}
												className="flex items-center gap-1 font-medium text-foreground hover:text-primary hover:underline"
											>
												{author.firstName} {author.lastName}
												<IconUserCircle className="size-4 text-muted-foreground" />
											</Link>
										) : (
											<span className="font-medium text-foreground">
												{author.firstName} {author.lastName}
											</span>
										)}
										{author.isPresenter && (
											<Badge
												variant="secondary"
												className="gap-1 border-primary/20 bg-primary/10 text-xs text-primary"
											>
												<IconStarFilled className="size-3" />
												Presenter
											</Badge>
										)}
									</div>
									<p className="mt-0.5 truncate text-sm text-muted-foreground">
										{author.affiliationName ?? (
											<span className="italic opacity-70">No affiliation</span>
										)}
									</p>
									<p className="truncate text-xs text-muted-foreground/70">
										{author.email}
									</p>
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader className="flex flex-row items-start justify-between gap-4">
					<CardTitle className="text-base">Content</CardTitle>
					{versions.length > 1 && (
						<div className="w-44">
							<VersionSelector
								versions={versions}
								currentVersion={submission.currentVersionNumber}
								selectedVersion={effectiveVersion}
								onVersionChange={setSelectedVersion}
							/>
						</div>
					)}
				</CardHeader>
				<CardContent>
					{displayedFile ? (
						<div className="flex items-center gap-4 rounded-lg border bg-muted/30 p-4">
							<div className="shrink-0 rounded-md bg-primary/10 p-2">
								<IconFile className="size-6 text-primary" />
							</div>
							<div className="min-w-0 flex-1">
								<p className="truncate text-sm font-medium text-foreground">
									{displayedFile.originalName}
								</p>
								<p className="text-xs text-muted-foreground">
									{formatFileSize(displayedFile.size)}
								</p>
							</div>
							<a
								href={`/api/files/${displayedFile.id}`}
								data-testid="file-download-button"
								className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
							>
								<IconDownload className="size-4" />
								Download
							</a>
						</div>
					) : (
						<div className="prose prose-sm max-w-none dark:prose-invert">
							{displayedContent.split(/\n{2,}/).map((para, i) => (
								<p key={i} className="whitespace-pre-wrap break-words">
									{para}
								</p>
							))}
						</div>
					)}
				</CardContent>
			</Card>
		</>
	);
}
