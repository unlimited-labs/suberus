import {
	IconDownload,
	IconFile,
	IconHistory,
	IconStarFilled,
	IconTags,
	IconUsers,
	IconWriting,
} from "@tabler/icons-react";
import type {
	UserSubmissionAuthor,
	UserSubmissionFile,
	UserSubmissionStatusHistory,
} from "@/features/submissions/api/submissions";
import { SubmissionTimeline } from "@/features/submissions/components/submission-timeline";
import { formatFileSize } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";

interface ContentTabsProps {
	title: string;
	content: string;
	keywords: string[];
	authors: UserSubmissionAuthor[];
	statusHistory: UserSubmissionStatusHistory[];
	file?: UserSubmissionFile | null;
}

export function ContentTabs({
	title,
	content,
	keywords,
	authors,
	statusHistory,
	file,
}: ContentTabsProps) {
	return (
		<div
			className="bg-card border-border/50 rounded-2xl border p-8 shadow-2xl"
			data-testid="submission-content-card"
		>
			<Tabs className="w-full" defaultValue="overview">
				<TabsList className="mb-6" variant="line">
					<TabsTrigger className="gap-2" value="overview">
						<IconWriting className="size-4" />
						<span className="hidden sm:inline">Overview</span>
					</TabsTrigger>
					<TabsTrigger className="gap-2" value="history">
						<IconHistory className="size-4" />
						<span className="hidden sm:inline">History</span>
					</TabsTrigger>
				</TabsList>

				<TabsContent className="space-y-6" value="overview">
					<h1 className="text-foreground text-xl leading-tight font-semibold tracking-tight">
						{title}
					</h1>

					{file ? (
						<div className="space-y-2">
							<p className="text-muted-foreground text-sm font-medium">
								Document
							</p>
							<div className="border-border/50 bg-muted/30 flex items-center gap-4 rounded-lg border p-4">
								<div className="bg-primary/10 shrink-0 rounded-md p-2">
									<IconFile className="text-primary size-6" />
								</div>
								<div className="min-w-0 flex-1">
									<p className="text-foreground truncate text-sm font-medium">
										{file.originalName}
									</p>
									<p className="text-muted-foreground text-xs">
										{formatFileSize(file.size)}
									</p>
								</div>
								<Button asChild className="gap-2" size="sm" variant="outline">
									<a
										data-testid="file-download-button"
										href={`/api/files/${file.id}`}
									>
										<IconDownload className="size-4" />
										Download
									</a>
								</Button>
							</div>
						</div>
					) : content ? (
						<div className="space-y-2">
							<p className="text-muted-foreground text-sm font-medium">
								Abstract
							</p>
							<div className="text-foreground bg-muted/30 border-border/50 rounded-lg border p-4 text-sm leading-relaxed wrap-break-word whitespace-pre-line">
								{content}
							</div>
						</div>
					) : (
						<div className="space-y-2">
							<p className="text-muted-foreground text-sm font-medium">
								Content
							</p>
							<div className="text-muted-foreground border-border/50 bg-muted/30 rounded-lg border p-4 text-sm">
								No content available
							</div>
						</div>
					)}

					<div className="space-y-3">
						<div className="flex items-center gap-2">
							<IconTags className="text-muted-foreground size-4" />
							<p className="text-muted-foreground text-sm font-medium">
								Keywords
							</p>
						</div>
						<div className="flex flex-wrap gap-2">
							{keywords.map((keyword) => (
								<Badge
									className="px-3 py-1 text-sm"
									key={keyword}
									variant="secondary"
								>
									{keyword}
								</Badge>
							))}
						</div>
					</div>

					<div className="space-y-3">
						<div className="flex items-center gap-2">
							<IconUsers className="text-muted-foreground size-4" />
							<p className="text-muted-foreground text-sm font-medium">
								Authors
							</p>
						</div>
						<div className="space-y-1">
							{authors.map((author) => (
								<div
									className="flex flex-wrap items-center gap-2 text-sm"
									data-testid="author-row"
									key={author.email}
								>
									<span className="font-medium">
										{author.firstName} {author.lastName}
									</span>
									{author.isPresenter && (
										<IconStarFilled className="text-primary size-3" />
									)}
									<span className="text-muted-foreground">
										• {author.affiliation}
									</span>
								</div>
							))}
						</div>
					</div>
				</TabsContent>

				<TabsContent value="history">
					<SubmissionTimeline compact statusHistory={statusHistory} />
				</TabsContent>
			</Tabs>
		</div>
	);
}
