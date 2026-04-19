import {
	IconAlertTriangle,
	IconChevronDown,
	IconChevronUp,
} from "@tabler/icons-react";
import { useMemo, useState } from "react";
import type { ProgramSessionDetail } from "@/utils/program-sessions.server";

interface Issue {
	type: "room-overlap" | "no-room";
	message: string;
	sessionIds: string[];
}

function detectIssues(sessions: ProgramSessionDetail[]): Issue[] {
	const issues: Issue[] = [];

	// No room assigned
	for (const s of sessions) {
		if (!s.roomId) {
			issues.push({
				type: "no-room",
				message: `"${s.title}" has no room assigned`,
				sessionIds: [s.id],
			});
		}
	}

	// Room overlaps
	const roomSessions = sessions.filter((s) => s.roomId);
	for (let i = 0; i < roomSessions.length; i++) {
		for (let j = i + 1; j < roomSessions.length; j++) {
			const a = roomSessions[i];
			const b = roomSessions[j];
			if (a.roomId !== b.roomId) continue;
			const aStart = new Date(a.startAt).getTime();
			const aEnd = new Date(a.endAt).getTime();
			const bStart = new Date(b.startAt).getTime();
			const bEnd = new Date(b.endAt).getTime();
			if (aStart < bEnd && aEnd > bStart) {
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
	sessions: ProgramSessionDetail[];
}

export function IssuesPanel({ sessions }: IssuesPanelProps) {
	const [expanded, setExpanded] = useState(false);
	const issues = useMemo(() => detectIssues(sessions), [sessions]);

	if (issues.length === 0) return null;

	const overlapCount = issues.filter((i) => i.type === "room-overlap").length;
	const noRoomCount = issues.filter((i) => i.type === "no-room").length;

	return (
		<div className="mx-4 mb-0 mt-3 overflow-hidden rounded-md border border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30">
			<button
				type="button"
				onClick={() => setExpanded((v) => !v)}
				className="flex w-full items-center gap-2 px-3 py-2 text-left"
			>
				<IconAlertTriangle
					size={14}
					className="shrink-0 text-amber-600 dark:text-amber-400"
				/>
				<span className="flex-1 text-xs font-medium text-amber-800 dark:text-amber-300">
					{issues.length} {issues.length === 1 ? "issue" : "issues"}
					{overlapCount > 0 && noRoomCount > 0 && (
						<span className="ml-1 font-normal opacity-70">
							({overlapCount} overlap{overlapCount > 1 ? "s" : ""},{" "}
							{noRoomCount} without room)
						</span>
					)}
					{overlapCount > 0 && noRoomCount === 0 && (
						<span className="ml-1 font-normal opacity-70">
							({overlapCount} overlap{overlapCount > 1 ? "s" : ""})
						</span>
					)}
					{noRoomCount > 0 && overlapCount === 0 && (
						<span className="ml-1 font-normal opacity-70">
							({noRoomCount} without room)
						</span>
					)}
				</span>
				{expanded ? (
					<IconChevronUp
						size={13}
						className="text-amber-600 dark:text-amber-400"
					/>
				) : (
					<IconChevronDown
						size={13}
						className="text-amber-600 dark:text-amber-400"
					/>
				)}
			</button>

			{expanded && (
				<ul className="border-t border-amber-200 px-3 py-2 dark:border-amber-900/60">
					{issues.map((issue, i) => (
						<li
							// biome-ignore lint/suspicious/noArrayIndexKey: static list
							key={i}
							className="flex items-start gap-2 py-0.5"
						>
							<span
								className={`mt-1 size-1.5 shrink-0 rounded-full ${
									issue.type === "room-overlap" ? "bg-red-500" : "bg-amber-500"
								}`}
							/>
							<span className="text-xs text-amber-900 dark:text-amber-200">
								{issue.message}
							</span>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
