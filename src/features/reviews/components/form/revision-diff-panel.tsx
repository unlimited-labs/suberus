import { IconGitCompare } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { TextDiffView } from "@/shared/components/diff/text-diff-view";
import { diffText } from "@/shared/lib/text-diff";
import { Button } from "@/shared/ui/button";
import { SectionCard } from "@/shared/ui/section-card";

interface RevisionDiffPanelProps {
	previous: { title: string; content: string };
	title: string;
	content: string;
	assignmentId: string;
}

/**
 * "Changes since previous version" — an always-visible inline redline of title +
 * content against the previous version, plus a link to the full compare page.
 * Renders whenever a previous version exists (even with no text change — the file
 * may have changed, which only the compare page surfaces). Blind-safe: title/content
 * only, no authors.
 */
export function RevisionDiffPanel({
	previous,
	title,
	content,
	assignmentId,
}: RevisionDiffPanelProps) {
	const titleDiff = diffText(previous.title, title);
	const contentDiff = diffText(previous.content, content);

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
			<div className="space-y-1">
				<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
					Content
				</p>
				<div className="max-h-96 overflow-auto rounded-lg border border-border bg-muted/30 p-4">
					<TextDiffView
						segments={contentDiff}
						emptyLabel="Content unchanged."
					/>
				</div>
			</div>
		</SectionCard>
	);
}
