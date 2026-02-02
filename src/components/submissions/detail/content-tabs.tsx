import {
	IconHistory,
	IconTags,
	IconUsers,
	IconWriting,
} from "@tabler/icons-react";
import { SubmissionTimeline } from "@/components/submissions/submission-timeline";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
	UserSubmissionAuthor,
	UserSubmissionStatusHistory,
} from "@/utils/submissions.functions";
import { AuthorCard } from "./author-card";

interface ContentTabsProps {
	title: string;
	content: string;
	keywords: string[];
	authors: UserSubmissionAuthor[];
	statusHistory: UserSubmissionStatusHistory[];
}

export function ContentTabs({
	title,
	content,
	keywords,
	authors,
	statusHistory,
}: ContentTabsProps) {
	return (
		<div className="rounded-2xl bg-card shadow-2xl border p-8">
			<Tabs defaultValue="overview" className="w-full">
				<TabsList variant="line" className="mb-6">
					<TabsTrigger value="overview" className="gap-2">
						<IconWriting className="size-4" />
						<span className="hidden sm:inline">Overview</span>
					</TabsTrigger>
					<TabsTrigger value="authors" className="gap-2">
						<IconUsers className="size-4" />
						<span className="hidden sm:inline">Authors ({authors.length})</span>
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

					<div className="space-y-2">
						<p className="text-sm font-medium text-muted-foreground">
							Abstract
						</p>
						<div className="text-sm text-foreground leading-relaxed whitespace-pre-line bg-muted/30 p-4 rounded-lg border">
							{content}
						</div>
					</div>

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
				</TabsContent>

				<TabsContent value="authors" className="space-y-4">
					<div className="space-y-3">
						{authors.map((author, index) => (
							<AuthorCard
								key={`${author.email}-${index}`}
								author={author}
								index={index}
							/>
						))}
					</div>
				</TabsContent>

				<TabsContent value="history">
					<SubmissionTimeline statusHistory={statusHistory} compact />
				</TabsContent>
			</Tabs>
		</div>
	);
}
