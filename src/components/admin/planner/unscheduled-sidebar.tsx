import { useHotkey } from "@tanstack/react-hotkeys";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { unscheduledSubmissionsQueryOptions } from "@/server-fns/planner/sessions";
import { BulkReadReader } from "./bulk-read-reader";
import { usePlannerSelection } from "./planner-context";
import {
	type GroupingMode,
	groupSubmissions,
	matchesSearch,
} from "./session-grouper";
import { GroupingTabs } from "./unscheduled/grouping-tabs";
import { SelectionBar } from "./unscheduled/selection-bar";
import { SidebarCollapsed } from "./unscheduled/sidebar-collapsed";
import { SidebarHeader } from "./unscheduled/sidebar-header";
import { SidebarSearch } from "./unscheduled/sidebar-search";
import { UnscheduledEmpty } from "./unscheduled/unscheduled-empty";
import { UnscheduledGroup } from "./unscheduled/unscheduled-group";
import { useSubmissionSelection } from "./unscheduled/use-submission-selection";
import { useToggleSet } from "./unscheduled/use-toggle-set";

export function UnscheduledSidebar() {
	const { openCreateFromSelection } = usePlannerSelection();
	const { data: submissions } = useSuspenseQuery(
		unscheduledSubmissionsQueryOptions(),
	);
	const [open, setOpen] = useState(true);
	const [search, setSearch] = useState("");
	const [mode, setMode] = useState<GroupingMode>("intake");
	const [selectMode, setSelectMode] = useState(false);
	const collapsed = useToggleSet<string>();
	const expanded = useToggleSet<string>();
	const [draggingId, setDraggingId] = useState<string | null>(null);
	const [readerStart, setReaderStart] = useState<number | null>(null);

	const showTypeBadge = useMemo(
		() => new Set(submissions.map((s) => s.type)).size > 1,
		[submissions],
	);

	const filtered = useMemo(
		() => submissions.filter((s) => matchesSearch(s, search.trim())),
		[submissions, search],
	);

	const groups = useMemo(
		() => groupSubmissions(filtered, mode),
		[filtered, mode],
	);

	const flatIds = useMemo(
		() => groups.flatMap((g) => g.submissions.map((s) => s.id)),
		[groups],
	);

	const selection = useSubmissionSelection(flatIds);

	const handleCreateSession = useCallback(
		() => openCreateFromSelection(Array.from(selection.selected)),
		[openCreateFromSelection, selection.selected],
	);

	const handleToggleSelectMode = useCallback(() => {
		setSelectMode((prev) => {
			if (prev) selection.clear();
			return !prev;
		});
	}, [selection.clear]);

	useHotkey("S", handleToggleSelectMode, { enabled: open });
	useHotkey(
		"Escape",
		() => {
			selection.clear();
			setSelectMode(false);
		},
		{ enabled: open && selectMode },
	);

	const handleDragStart = useCallback((id: string) => setDraggingId(id), []);
	const handleDragEnd = useCallback(() => setDraggingId(null), []);

	const handleOpenReader = useCallback(
		(id: string) => {
			const index = submissions.findIndex((s) => s.id === id);
			if (index >= 0) setReaderStart(index);
		},
		[submissions],
	);

	if (!open) {
		return (
			<SidebarCollapsed
				count={submissions.length}
				onExpand={() => setOpen(true)}
			/>
		);
	}

	return (
		<>
			<div
				data-testid="unscheduled-sidebar"
				className="flex min-h-0 w-72 shrink-0 flex-col border-r"
			>
				<SidebarHeader
					count={submissions.length}
					selectMode={selectMode}
					onToggleSelectMode={handleToggleSelectMode}
					onOpenReader={() => setReaderStart(0)}
					onCollapse={() => setOpen(false)}
				/>
				<SidebarSearch value={search} onChange={setSearch} />
				<GroupingTabs mode={mode} onChange={setMode} />

				<div className="flex-1 overflow-y-auto">
					{groups.length === 0 ? (
						<UnscheduledEmpty hasSearch={Boolean(search)} />
					) : (
						groups.map((group, gIdx) => {
							// First group defaults to expanded; others default to collapsed.
							// Toggle state inverts the default.
							const toggleKey = gIdx === 0 ? group.key : `open:${group.key}`;
							const isCollapsed =
								gIdx === 0
									? collapsed.set.has(toggleKey)
									: !collapsed.set.has(toggleKey);
							return (
								<UnscheduledGroup
									key={group.key}
									group={group}
									isCollapsed={isCollapsed}
									onToggle={() => collapsed.toggle(toggleKey)}
									selectMode={selectMode}
									showTypeBadge={showTypeBadge}
									selectedIds={selection.selected}
									expandedIds={expanded.set}
									draggingId={draggingId}
									onToggleSelect={selection.toggle}
									onToggleExpand={expanded.toggle}
									onOpenReader={handleOpenReader}
									onDragStart={handleDragStart}
									onDragEnd={handleDragEnd}
								/>
							);
						})
					)}
				</div>

				{selection.selected.size > 0 && (
					<SelectionBar
						count={selection.selected.size}
						onCreateSession={handleCreateSession}
						onClear={selection.clear}
					/>
				)}
			</div>
			{readerStart !== null && (
				<BulkReadReader
					submissions={submissions}
					initialIndex={readerStart}
					onClose={() => setReaderStart(null)}
				/>
			)}
		</>
	);
}
