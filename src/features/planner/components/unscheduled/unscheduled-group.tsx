import { IconChevronDown } from "@tabler/icons-react";
import type { SubmissionGroup } from "../session-grouper";
import { SubmissionRow } from "./submission-row";

interface Props {
	group: SubmissionGroup;
	isCollapsed: boolean;
	onToggle: () => void;
	selectMode: boolean;
	showTypeBadge: boolean;
	selectedIds: Set<string>;
	expandedIds: Set<string>;
	draggingId: string | null;
	onToggleSelect: (id: string, shift: boolean) => void;
	onToggleExpand: (id: string) => void;
	onOpenReader: (id: string) => void;
	onDragStart: (id: string) => void;
	onDragEnd: () => void;
}

export function UnscheduledGroup({
	group,
	isCollapsed,
	onToggle,
	selectMode,
	showTypeBadge,
	selectedIds,
	expandedIds,
	draggingId,
	onToggleSelect,
	onToggleExpand,
	onOpenReader,
	onDragStart,
	onDragEnd,
}: Props) {
	return (
		<div className="border-b last:border-b-0">
			<button
				className="bg-muted/20 hover:bg-muted/40 flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left"
				data-testid={`unscheduled-group-${group.key}`}
				onClick={onToggle}
				type="button"
			>
				<IconChevronDown
					className={`text-muted-foreground transition-transform ${
						isCollapsed ? "-rotate-90" : ""
					}`}
					size={11}
				/>
				<span className="text-foreground text-[11px] font-semibold tracking-wide uppercase">
					{group.label}
				</span>
				<span className="text-muted-foreground ml-auto text-[10px]">
					{group.submissions.length}
				</span>
			</button>
			{!isCollapsed && (
				<ul className="divide-y">
					{group.submissions.map((s) => (
						<SubmissionRow
							dragging={draggingId === s.id}
							expanded={expandedIds.has(s.id)}
							key={s.id}
							onDragEnd={onDragEnd}
							onDragStart={() => onDragStart(s.id)}
							onOpenReader={() => onOpenReader(s.id)}
							onToggleExpand={() => onToggleExpand(s.id)}
							onToggleSelect={(shift) => onToggleSelect(s.id, shift)}
							selected={selectedIds.has(s.id)}
							selectMode={selectMode}
							showTypeBadge={showTypeBadge}
							submission={s}
						/>
					))}
				</ul>
			)}
		</div>
	);
}
