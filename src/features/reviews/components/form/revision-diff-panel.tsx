import { IconFile, IconGitCompare } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { KeywordsDiff } from "@/features/submissions/components/diff/metadata-diff";
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
	/** FILE-format submissions diff the uploaded file, not the text body. */
	isFileSubmission: boolean;
	assignmentId: string;
}

/**
 * "Changes since previous version" — an always-visible round-over-round diff
 * against the previous version, plus a link to the full compare page. The body
 * is type-aware: TEXT submissions show a title/content redline; FILE submissions
 * show a file-changed notice instead (the inline file redline lives on the
 * compare page). Keywords diff in both cases. Renders whenever a previous version
 * exists. Blind-safe: title/content/keywords only, no authors.
 */
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
			title="Changes since previous version"
			icon={IconGitCompare}
			contentClassName="space-y-4"
			action={
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
			}
		>
			<div className="space-y-1">
				<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
					Title
				</p>
				<TextDiffView segments={titleDiff} emptyLabel="Title unchanged." />
			</div>

			{isFileSubmission ? (
				<FileChangeNotice changed={fileChanged(previous.file?.id, file?.id)} />
			) : (
				<div className="space-y-1">
					<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
						Content
					</p>
					<div className="max-h-96 overflow-auto rounded-lg border border-border bg-muted/30 p-4">
						<TextDiffView
							segments={diffText(previous.content, content)}
							emptyLabel="Content unchanged."
						/>
					</div>
				</div>
			)}

			<div className="space-y-1">
				<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
					Keywords
				</p>
				<KeywordsDiff
					base={previous.keywords ?? []}
					compare={keywords}
					emptyLabel="Keywords unchanged."
					layout="inline"
					oldLabel="Previous"
					newLabel="Current"
				/>
			</div>
		</SectionCard>
	);
}

function FileChangeNotice({ changed }: { changed: boolean }) {
	return (
		<div className="space-y-1">
			<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
				File
			</p>
			<div
				data-testid="reviewer-file-change-notice"
				data-changed={changed}
				className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground"
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
