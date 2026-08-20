import { IconAlertTriangle, IconCheck, IconLoader2 } from "@tabler/icons-react";
import type { ScheduleIssue } from "@/features/planner/server/schedule";

const ISSUE_LABELS = {
	SESSION_WITHOUT_CHAIR: "Session without chair",
	SLOT_DURATION_OVERFLOW: "Presentations exceed session duration",
	ROOM_DOUBLE_BOOKED: "Room double-booked",
	CHAIR_OVERLAP: "Chair in overlapping sessions",
	AUTHOR_TIME_CLASH: "Co-author double-booked",
	PRESENTER_PARALLEL_SESSION: "Presenter in parallel sessions",
	NON_ACCEPTED_SUBMISSION: "Non-accepted submission in program",
	SESSION_OUT_OF_BOUNDS: "Session outside conference dates",
} satisfies Record<string, string>;

interface PublishIssuesPanelProps {
	issues: ScheduleIssue[] | undefined;
	issuesLoading: boolean;
	isDraftPublished: boolean;
	onSelectIssue: (sessionId: string) => void;
}

export function PublishIssuesPanel({
	issues,
	issuesLoading,
	isDraftPublished,
	onSelectIssue,
}: PublishIssuesPanelProps) {
	return (
		<div className="flex min-h-0 flex-1 flex-col gap-3 py-2">
			{issuesLoading ? (
				<div className="flex items-center gap-2 text-sm text-muted-foreground">
					<IconLoader2 size={14} className="animate-spin" />
					Checking for issues…
				</div>
			) : issues && issues.length > 0 ? (
				<>
					<p className="shrink-0 text-sm text-muted-foreground">
						{issues.length} issue{issues.length !== 1 ? "s" : ""} found. You can
						still publish.
					</p>
					<ul
						data-testid="publish-issues-list"
						className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1"
					>
						{issues.map((issue, i) => {
							const targetId = issue.sessionIds[0];
							const key = `${issue.kind}:${issue.sessionIds.join(":")}:${issue.message}`;
							const body = (
								<>
									<IconAlertTriangle
										size={14}
										className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400"
									/>
									<div className="flex-1">
										<p className="font-medium text-amber-900 dark:text-amber-200">
											{ISSUE_LABELS[issue.kind] ?? issue.kind}
										</p>
										<p className="text-xs text-amber-700 dark:text-amber-400">
											{issue.message}
										</p>
									</div>
								</>
							);
							if (targetId) {
								return (
									<li key={key} data-testid={`publish-issue-${i}`}>
										<button
											type="button"
											onClick={() => onSelectIssue(targetId)}
											className="flex w-full items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-left text-sm transition-colors hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950 dark:hover:bg-amber-900"
										>
											{body}
										</button>
									</li>
								);
							}
							return (
								<li
									key={key}
									data-testid={`publish-issue-${i}`}
									className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm dark:border-amber-800 dark:bg-amber-950"
								>
									{body}
								</li>
							);
						})}
					</ul>
				</>
			) : (
				<div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
					<IconCheck size={14} className="shrink-0" />
					No issues found. Ready to publish.
				</div>
			)}

			{isDraftPublished && (
				<div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
					Program is shared with admins only. Publish to make it visible to
					everyone, or unpublish to hide it completely.
				</div>
			)}
		</div>
	);
}
