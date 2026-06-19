import { IconGitCompare } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { TextDiffView } from "@/shared/components/diff/text-diff-view";
import { diffText } from "@/shared/lib/text-diff";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

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
		<Card>
			<CardHeader className="flex flex-row items-center justify-between gap-4">
				<CardTitle className="flex items-center gap-2 text-base">
					<IconGitCompare className="size-5 text-muted-foreground" />
					Changes since previous version
				</CardTitle>
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
			</CardHeader>
			<CardContent className="space-y-4">
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
			</CardContent>
		</Card>
	);
}
