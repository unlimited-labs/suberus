import { IconAlertTriangle } from "@tabler/icons-react";
import { areIntervalsOverlapping } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { usePlannerSelection } from "./planner-context";
import type { PlannerSession } from "./types";

interface Issue {
	type: "room-overlap" | "no-room";
	message: string;
	sessionIds: string[];
}

function detectIssues(sessions: PlannerSession[]): Issue[] {
	const issues: Issue[] = [];

	for (const s of sessions) {
		if (!s.roomId) {
			issues.push({
				type: "no-room",
				message: `"${s.title}" has no room assigned`,
				sessionIds: [s.id],
			});
		}
	}

	const roomSessions = sessions.filter((s) => s.roomId);
	for (let i = 0; i < roomSessions.length; i++) {
		for (let j = i + 1; j < roomSessions.length; j++) {
			const a = roomSessions[i];
			const b = roomSessions[j];
			if (a.roomId !== b.roomId) continue;
			const overlap = areIntervalsOverlapping(
				{ start: new Date(a.startAt), end: new Date(a.endAt) },
				{ start: new Date(b.startAt), end: new Date(b.endAt) },
			);
			if (overlap) {
				issues.push({
					type: "room-overlap",
					message: `"${a.title}" and "${b.title}" overlap in the same room`,
					sessionIds: [a.id, b.id],
				});
			}
		}
	}

	return issues;
}

interface IssuesPanelProps {
	sessions: PlannerSession[];
}

export function IssuesPanel({ sessions }: IssuesPanelProps) {
	const { selectSession } = usePlannerSelection();
	const issues = detectIssues(sessions);

	if (issues.length === 0) return null;

	const overlapCount = issues.filter((i) => i.type === "room-overlap").length;
	const noRoomCount = issues.filter((i) => i.type === "no-room").length;

	const summary =
		overlapCount > 0 && noRoomCount > 0
			? `${overlapCount} overlap${overlapCount > 1 ? "s" : ""}, ${noRoomCount} without room`
			: overlapCount > 0
				? `${overlapCount} overlap${overlapCount > 1 ? "s" : ""}`
				: `${noRoomCount} without room`;

	return (
		<div className="px-4 pt-2">
			<Popover>
				<PopoverTrigger asChild>
					<button
						type="button"
						data-testid="issues-popover-trigger"
						className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300 dark:hover:bg-amber-950/60"
					>
						<IconAlertTriangle size={13} className="shrink-0" />
						<span>
							{issues.length} {issues.length === 1 ? "issue" : "issues"}
						</span>
						<span className="font-normal opacity-70">· {summary}</span>
					</button>
				</PopoverTrigger>
				<PopoverContent
					align="start"
					data-testid="issues-popover"
					className="w-96 max-w-[calc(100vw-2rem)] p-0"
				>
					<div className="border-b px-3 py-2 text-xs font-medium">
						Issues ({issues.length})
					</div>
					<ul className="max-h-[60vh] overflow-y-auto p-2">
						{issues.map((issue, i) => {
							const dot = (
								<span
									className={`mt-1.5 size-1.5 shrink-0 rounded-full ${
										issue.type === "room-overlap"
											? "bg-red-500"
											: "bg-amber-500"
									}`}
								/>
							);
							const targetId = issue.sessionIds[0];
							const key = `${issue.type}:${issue.sessionIds.join(":")}`;
							if (targetId) {
								return (
									<li key={key} data-testid={`issue-item-${i}`}>
										<button
											type="button"
											onClick={() => selectSession(targetId)}
											className="flex w-full items-start gap-2 rounded px-1.5 py-1 text-left hover:bg-muted"
										>
											{dot}
											<span className="flex-1 text-xs leading-relaxed">
												{issue.message}
											</span>
											{issue.sessionIds.length > 1 && (
												<span className="shrink-0 text-[10px] text-muted-foreground">
													+{issue.sessionIds.length - 1}
												</span>
											)}
										</button>
									</li>
								);
							}
							return (
								<li
									key={key}
									data-testid={`issue-item-${i}`}
									className="flex items-start gap-2 rounded px-1.5 py-1"
								>
									{dot}
									<span className="text-xs leading-relaxed">
										{issue.message}
									</span>
								</li>
							);
						})}
					</ul>
				</PopoverContent>
			</Popover>
		</div>
	);
}
