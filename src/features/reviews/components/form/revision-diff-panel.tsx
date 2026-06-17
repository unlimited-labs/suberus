import {
	IconChevronDown,
	IconChevronUp,
	IconGitCompare,
} from "@tabler/icons-react";
import { useState } from "react";
import { TextDiffView } from "@/shared/components/diff/text-diff-view";
import { diffText, hasChanges } from "@/shared/lib/text-diff";

interface RevisionDiffPanelProps {
	previous: { title: string; content: string };
	title: string;
	content: string;
}

function ToggleChevron({ expanded }: { expanded: boolean }) {
	return expanded ? (
		<IconChevronUp className="size-4 text-muted-foreground" />
	) : (
		<IconChevronDown className="size-4 text-muted-foreground" />
	);
}

/**
 * Collapsible "Changes since previous version" panel on the review form — an
 * inline redline of title + content against the previous version. Renders
 * nothing when neither changed. Title/content only (blind-safe: no authors).
 */
export function RevisionDiffPanel({
	previous,
	title,
	content,
}: RevisionDiffPanelProps) {
	const [expanded, setExpanded] = useState(false);
	const titleDiff = diffText(previous.title, title);
	const contentDiff = diffText(previous.content, content);

	const changed = hasChanges(titleDiff) || hasChanges(contentDiff);
	if (!changed) return null;

	return (
		<div className="mb-6 border rounded-lg overflow-hidden">
			<button
				type="button"
				onClick={() => setExpanded(!expanded)}
				className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
				data-testid="reviewer-diff-toggle"
			>
				<div className="flex items-center gap-2">
					<IconGitCompare className="size-5 text-muted-foreground" />
					<span className="font-medium text-sm text-foreground">
						Changes since previous version
					</span>
				</div>
				<ToggleChevron expanded={expanded} />
			</button>
			{expanded && (
				<div className="px-4 pb-4 space-y-4">
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
						<div className="bg-muted/30 p-4 rounded-lg border max-h-96 overflow-auto">
							<TextDiffView
								segments={contentDiff}
								emptyLabel="Content unchanged."
							/>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
