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
		<div className="rounded-2xl bg-card shadow-2xl border border-border/50 p-8">
			<Tabs defaultValue="overview" className="w-full">
				<TabsList variant="line" className="mb-6">
					<TabsTrigger value="overview" className="gap-2">
						<IconWriting className="size-4" />
						<span className="hidden sm:inline">Overview</span>
					</TabsTrigger>
					<TabsTrigger value="history" className="gap-2">
						<IconHistory className="size-4" />
						<span className="hidden sm:inline">History</span>
					</TabsTrigger>
				</TabsList>

				<TabsContent value="overview" className="space-y-6">
					<h1 className="text-xl font-semibold tracking-tight text-foreground leading-tight">
						{title}
					</h1>

					{file ? (
						<div className="space-y-2">
							<p className="text-sm font-medium text-muted-foreground">
								Document
							</p>
							<div className="flex items-center gap-4 p-4 rounded-lg border border-border/50 bg-muted/30">
								<div className="flex-shrink-0 p-2 rounded-md bg-primary/10">
									<IconFile className="size-6 text-primary" />
								</div>
								<div className="flex-1 min-w-0">
									<p className="text-sm font-medium text-foreground truncate">
										{file.originalName}
									</p>
									<p className="text-xs text-muted-foreground">
										{formatFileSize(file.size)}
									</p>
								</div>
								<Button variant="outline" size="sm" className="gap-2" asChild>
									<a
										href={`/api/files/${file.id}`}
										data-testid="file-download-button"
									>
										<IconDownload className="size-4" />
										Download
									</a>
								</Button>
							</div>
						</div>
					) : content ? (
						<div className="space-y-2">
							<p className="text-sm font-medium text-muted-foreground">
								Abstract
							</p>
							<div className="text-sm text-foreground leading-relaxed whitespace-pre-line break-words bg-muted/30 p-4 rounded-lg border border-border/50">
								{content}
							</div>
						</div>
					) : (
						<div className="space-y-2">
							<p className="text-sm font-medium text-muted-foreground">
								Content
							</p>
							<div className="text-sm text-muted-foreground p-4 rounded-lg border border-border/50 bg-muted/30">
								No content available
							</div>
						</div>
					)}

					<div className="space-y-3">
						<div className="flex items-center gap-2">
							<IconTags className="size-4 text-muted-foreground" />
							<p className="text-sm font-medium text-muted-foreground">
								Keywords
							</p>
						</div>
						<div className="flex flex-wrap gap-2">
							{keywords.map((keyword) => (
								<Badge
									key={keyword}
									variant="secondary"
									className="text-sm px-3 py-1"
								>
									{keyword}
								</Badge>
							))}
						</div>
					</div>

					<div className="space-y-3">
						<div className="flex items-center gap-2">
							<IconUsers className="size-4 text-muted-foreground" />
							<p className="text-sm font-medium text-muted-foreground">
								Authors
							</p>
						</div>
						<div className="space-y-1">
							{authors.map((author, index) => (
								<div
									key={`${author.email}-${index}`}
									className="text-sm flex items-center gap-2 flex-wrap"
								>
									<span className="font-medium">
										{author.firstName} {author.lastName}
									</span>
									{author.isPresenter && (
										<IconStarFilled className="size-3 text-primary" />
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
					<SubmissionTimeline statusHistory={statusHistory} compact />
				</TabsContent>
			</Tabs>
		</div>
	);
}
