import { IconFile, IconGitCompare } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { KeywordsDiff } from "@/shared/components/diff/keywords-diff";
import { TextDiffView } from "@/shared/components/diff/text-diff-view";
import { diffText, fileChanged } from "@/shared/lib/text-diff";
import { Button } from "@/shared/ui/button";
import { SectionCard } from "@/shared/ui/section-card";

interface DiffFile {
	id: string;
}

interface RevisionDiffPanelProps {
	previous: {
		title: string;
		content: string;
		file?: DiffFile | null;
		keywords?: string[];
	};
	title: string;
	content: string;
	file?: DiffFile | null;
	keywords: string[];
	isFileSubmission: boolean;
	assignmentId: string;
}

export function RevisionDiffPanel({
	previous,
	title,
	content,
	file,
	keywords,
	isFileSubmission,
	assignmentId,
}: RevisionDiffPanelProps) {
	const titleDiff = diffText(previous.title, title);

	return (
		<SectionCard
			action={
				<Button asChild className="gap-2" size="sm" variant="outline">
					<Link
						data-testid="reviewer-compare-link"
						params={{ assignmentId }}
						to="/reviews/$assignmentId/compare"
					>
						<IconGitCompare className="size-4" />
						Compare versions
					</Link>
				</Button>
			}
			contentClassName="space-y-4"
			icon={IconGitCompare}
			title="Changes since previous version"
		>
			<div className="space-y-1">
				<p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
					Title
				</p>
				<TextDiffView emptyLabel="Title unchanged." segments={titleDiff} />
			</div>

			{isFileSubmission ? (
				<FileChangeNotice changed={fileChanged(previous.file?.id, file?.id)} />
			) : (
				<div className="space-y-1">
					<p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
						Content
					</p>
					<div className="border-border bg-muted/30 max-h-96 overflow-auto rounded-lg border p-4">
						<TextDiffView
							emptyLabel="Content unchanged."
							segments={diffText(previous.content, content)}
						/>
					</div>
				</div>
			)}

			<div className="space-y-1">
				<p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
					Keywords
				</p>
				<KeywordsDiff
					base={previous.keywords ?? []}
					compare={keywords}
					emptyLabel="Keywords unchanged."
					layout="inline"
					newLabel="Current"
					oldLabel="Previous"
				/>
			</div>
		</SectionCard>
	);
}

function FileChangeNotice({ changed }: { changed: boolean }) {
	return (
		<div className="space-y-1">
			<p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
				File
			</p>
			<div
				className="border-border bg-muted/30 text-muted-foreground flex items-start gap-2 rounded-lg border p-3 text-sm"
				data-changed={changed}
				data-testid="reviewer-file-change-notice"
			>
				<IconFile className="mt-0.5 size-4 shrink-0" />
				<span>
					{changed
						? "File changed — open Compare versions to see the redline."
						: "File unchanged."}
				</span>
			</div>
		</div>
	);
}
