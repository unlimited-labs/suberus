import { useHotkey } from "@tanstack/react-hotkeys";
import { useSuspenseQuery } from "@tanstack/react-query";
import { type ComponentProps, useState } from "react";
import {
	allSessionsQueryOptions,
	unscheduledSubmissionsQueryOptions,
} from "@/features/planner/api/sessions";
import { resolveGroupCollapse } from "@/features/planner/components/unscheduled-sidebar-helpers";
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

type SubmissionGroup = ReturnType<typeof groupSubmissions>[number];
type ToggleSet = { set: ReadonlySet<string>; toggle: (key: string) => void };
type GroupRenderProps = Omit<
	ComponentProps<typeof UnscheduledGroup>,
	"group" | "isCollapsed" | "onToggle"
>;

function ScheduledBody(props: ComponentProps<typeof ScheduledList>) {
	return (
		<div className="flex-1 overflow-y-auto">
			<ScheduledList {...props} />
		</div>
	);
}

function UnscheduledBody({
	groups,
	collapsed,
	groupProps,
	search,
	mode,
	onModeChange,
	selectionSize,
	onCreateSession,
	onClear,
}: {
	groups: SubmissionGroup[];
	collapsed: ToggleSet;
	groupProps: GroupRenderProps;
	search: string;
	mode: GroupingMode;
	onModeChange: (mode: GroupingMode) => void;
	selectionSize: number;
	onCreateSession: () => void;
	onClear: () => void;
}) {
	return (
		<>
			<GroupingTabs mode={mode} onChange={onModeChange} />
			<div className="flex-1 overflow-y-auto">
				{groups.length === 0 ? (
					<UnscheduledEmpty hasSearch={Boolean(search)} />
				) : (
					groups.map((group, gIdx) => {
						const { toggleKey, isCollapsed } = resolveGroupCollapse(
							gIdx,
							group.key,
							collapsed.set,
						);
						return (
							<UnscheduledGroup
								key={group.key}
								group={group}
								isCollapsed={isCollapsed}
								onToggle={() => collapsed.toggle(toggleKey)}
								{...groupProps}
							/>
						);
					})
				)}
			</div>
			{selectionSize > 0 && (
				<SelectionBar
					count={selectionSize}
					onCreateSession={onCreateSession}
					onClear={onClear}
				/>
			)}
		</>
	);
}

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

	const showTypeBadge = new Set(submissions.map((s) => s.type)).size > 1;

	const filtered = submissions.filter((s) => matchesSearch(s, search.trim()));

	const groups = groupSubmissions(filtered, mode);

	const flatIds = groups.flatMap((g) => g.submissions.map((s) => s.id));

	const selection = useSubmissionSelection(flatIds);

	const handleCreateSession = () =>
		openCreateFromSelection(Array.from(selection.selected));

	const handleToggleSelectMode = () => {
		setSelectMode((prev) => {
			if (prev) selection.clear();
			return !prev;
		});
	};

	useHotkey("S", handleToggleSelectMode, { enabled: open });
	useHotkey(
		"Escape",
		() => {
			selection.clear();
			setSelectMode(false);
		},
		{ enabled: open && selectMode },
	);

	const handleDragStart = (id: string) => setDraggingId(id);
	const handleDragEnd = () => setDraggingId(null);

	const handleOpenReader = (id: string) => {
		const index = submissions.findIndex((s) => s.id === id);
		if (index >= 0) setReaderStart(index);
	};

	const scheduledCount = sessions.reduce(
		(n, s) => n + s.presentations.length,
		0,
	);
	const hasItems =
		listMode === "scheduled" ? scheduledCount > 0 : submissions.length > 0;
	const isScheduled = listMode === "scheduled";

	const handleToggleListMode = () => {
		setListMode((prev) => {
			const next: ListMode = prev === "scheduled" ? "unscheduled" : "scheduled";
			if (next === "scheduled") {
				selection.clear();
				setSelectMode(false);
			}
			setSearch("");
			return next;
		});
	};

	if (!open) {
		return (
			<SidebarCollapsed
				count={submissions.length}
				onExpand={() => setOpen(true)}
			/>
		);
	}

	const groupProps: GroupRenderProps = {
		selectMode,
		showTypeBadge,
		selectedIds: selection.selected,
		expandedIds: expanded.set,
		draggingId,
		onToggleSelect: selection.toggle,
		onToggleExpand: expanded.toggle,
		onOpenReader: handleOpenReader,
		onDragStart: handleDragStart,
		onDragEnd: handleDragEnd,
	};

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

				{isScheduled ? (
					<ScheduledBody
						sessions={sessions}
						search={search}
						timezone={settings.timezone || undefined}
						onOpenSession={selectSession}
					/>
				) : (
					<UnscheduledBody
						groups={groups}
						collapsed={collapsed}
						groupProps={groupProps}
						search={search}
						mode={mode}
						onModeChange={setMode}
						selectionSize={selection.selected.size}
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
