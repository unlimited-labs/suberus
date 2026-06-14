import { useHotkey } from "@tanstack/react-hotkeys";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import {
	allSessionsQueryOptions,
	unscheduledSubmissionsQueryOptions,
} from "@/features/planner/api/sessions";
import { conferenceSettingsQueryOptions } from "@/features/settings/api/settings";
import { BulkReadReader } from "./bulk-read-reader";
import { usePlannerSelection } from "./planner-context";
import {
	type GroupingMode,
	groupSubmissions,
	matchesSearch,
} from "./session-grouper";
import { GroupingTabs } from "./unscheduled/grouping-tabs";
import { ScheduledList } from "./unscheduled/scheduled-list";
import { SelectionBar } from "./unscheduled/selection-bar";
import { SidebarCollapsed } from "./unscheduled/sidebar-collapsed";
import { SidebarHeader } from "./unscheduled/sidebar-header";
import { SidebarSearch } from "./unscheduled/sidebar-search";
import { UnscheduledEmpty } from "./unscheduled/unscheduled-empty";
import { UnscheduledGroup } from "./unscheduled/unscheduled-group";
import { useSubmissionSelection } from "./unscheduled/use-submission-selection";
import { useToggleSet } from "./unscheduled/use-toggle-set";

type ListMode = "unscheduled" | "scheduled";

export function UnscheduledSidebar() {
	const { openCreateFromSelection, selectSession } = usePlannerSelection();
	const { data: submissions } = useSuspenseQuery(
		unscheduledSubmissionsQueryOptions(),
	);
	const { data: sessions } = useSuspenseQuery(allSessionsQueryOptions());
	const { data: settings } = useSuspenseQuery(conferenceSettingsQueryOptions());
	const [open, setOpen] = useState(true);
	const [listMode, setListMode] = useState<ListMode>("unscheduled");
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

	const scheduledCount = useMemo(
		() => sessions.reduce((n, s) => n + s.presentations.length, 0),
		[sessions],
	);
	const hasItems =
		listMode === "scheduled" ? scheduledCount > 0 : submissions.length > 0;
	const isScheduled = listMode === "scheduled";

	const handleToggleListMode = useCallback(() => {
		setListMode((prev) => {
			const next: ListMode = prev === "scheduled" ? "unscheduled" : "scheduled";
			if (next === "scheduled") {
				selection.clear();
				setSelectMode(false);
			}
			setSearch("");
			return next;
		});
	}, [selection]);

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
					mode={listMode}
					hasItems={hasItems}
					selectMode={selectMode}
					onToggleMode={handleToggleListMode}
					onToggleSelectMode={handleToggleSelectMode}
					onOpenReader={() => setReaderStart(0)}
					onCollapse={() => setOpen(false)}
				/>
				<SidebarSearch value={search} onChange={setSearch} />
				{!isScheduled && <GroupingTabs mode={mode} onChange={setMode} />}

				<div className="flex-1 overflow-y-auto">
					{isScheduled ? (
						<ScheduledList
							sessions={sessions}
							search={search}
							timezone={settings.timezone || undefined}
							onOpenSession={selectSession}
						/>
					) : groups.length === 0 ? (
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

				{!isScheduled && selection.selected.size > 0 && (
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
