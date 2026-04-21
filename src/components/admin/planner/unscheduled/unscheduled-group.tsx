import { IconChevronDown } from "@tabler/icons-react";
import type { SubmissionGroup } from "../session-grouper";
import { SubmissionRow } from "./submission-row";

interface Props {
	group: SubmissionGroup;
	isCollapsed: boolean;
	onToggle: () => void;
	selectedIds: Set<string>;
	expandedIds: Set<string>;
	draggingId: string | null;
	onToggleSelect: (id: string, shift: boolean) => void;
	onToggleExpand: (id: string) => void;
	onDragStart: (id: string) => void;
	onDragEnd: () => void;
}

export function UnscheduledGroup({
	group,
	isCollapsed,
	onToggle,
	selectedIds,
	expandedIds,
	draggingId,
	onToggleSelect,
	onToggleExpand,
	onDragStart,
	onDragEnd,
}: Props) {
	return (
		<div className="border-b last:border-b-0">
			<button
				type="button"
				onClick={onToggle}
				data-testid={`unscheduled-group-${group.key}`}
				className="flex w-full items-center gap-1.5 bg-muted/20 px-2.5 py-1.5 text-left hover:bg-muted/40"
			>
				<IconChevronDown
					size={11}
					className={`text-muted-foreground transition-transform ${
						isCollapsed ? "-rotate-90" : ""
					}`}
				/>
				<span className="text-[11px] font-semibold uppercase tracking-wide text-foreground">
					{group.label}
				</span>
				<span className="ml-auto text-[10px] text-muted-foreground">
					{group.submissions.length}
				</span>
			</button>
			{!isCollapsed && (
				<ul className="divide-y">
					{group.submissions.map((s) => (
						<SubmissionRow
							key={s.id}
							submission={s}
							selected={selectedIds.has(s.id)}
							expanded={expandedIds.has(s.id)}
							dragging={draggingId === s.id}
							onToggleSelect={(shift) => onToggleSelect(s.id, shift)}
							onToggleExpand={() => onToggleExpand(s.id)}
							onDragStart={() => onDragStart(s.id)}
							onDragEnd={onDragEnd}
						/>
					))}
				</ul>
			)}
		</div>
	);
}
