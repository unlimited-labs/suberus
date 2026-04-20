import {
	IconBook,
	IconChevronDown,
	IconChevronLeft,
	IconLayoutList,
	IconSearch,
	IconX,
} from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { unscheduledSubmissionsQueryOptions } from "@/utils/program-sessions.functions";
import { BulkReadReader } from "./bulk-read-reader";
import {
	type GroupingMode,
	groupSubmissions,
	matchesSearch,
} from "./session-grouper";
import { SidebarCollapsed } from "./unscheduled/sidebar-collapsed";
import { SubmissionRow } from "./unscheduled/submission-row";
import { useSubmissionSelection } from "./unscheduled/use-submission-selection";
import { useToggleSet } from "./unscheduled/use-toggle-set";

const MODES: Array<{ key: GroupingMode; label: string }> = [
	{ key: "intake", label: "Track" },
	{ key: "presenter", label: "Presenter" },
];

interface SidebarProps {
	onCreateSession?: (submissionIds: string[]) => void;
}

export function UnscheduledSidebar({ onCreateSession }: SidebarProps = {}) {
	const { data: submissions } = useSuspenseQuery(
		unscheduledSubmissionsQueryOptions(),
	);
	const [open, setOpen] = useState(true);
	const [search, setSearch] = useState("");
	const [mode, setMode] = useState<GroupingMode>("intake");
	const collapsed = useToggleSet<string>();
	const expanded = useToggleSet<string>();
	const [draggingId, setDraggingId] = useState<string | null>(null);
	const [readerStart, setReaderStart] = useState<number | null>(null);

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
				<div className="flex items-center justify-between border-b px-3 py-2">
					<div className="flex items-center gap-1.5">
						<IconLayoutList size={14} className="text-muted-foreground" />
						<span className="text-xs font-medium">Unscheduled</span>
						<span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
							{submissions.length}
						</span>
					</div>
					<div className="flex items-center gap-1">
						{submissions.length > 0 && (
							<button
								type="button"
								onClick={() => setReaderStart(0)}
								data-testid="sidebar-bulk-read"
								className="flex items-center gap-1 rounded px-1.5 py-1 text-[10px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
								title="Open reading mode"
							>
								<IconBook size={12} />
								Read
							</button>
						)}
						<button
							type="button"
							onClick={() => setOpen(false)}
							className="rounded p-1 text-muted-foreground hover:bg-muted"
							aria-label="Collapse sidebar"
						>
							<IconChevronLeft size={14} />
						</button>
					</div>
				</div>

				<div className="border-b px-2 py-2">
					<div className="relative">
						<IconSearch
							size={12}
							className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
						/>
						<Input
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Search title, author, keyword…"
							data-testid="sidebar-search"
							className="h-7 pl-7 text-xs"
						/>
						{search && (
							<button
								type="button"
								onClick={() => setSearch("")}
								className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
								aria-label="Clear search"
							>
								<IconX size={11} />
							</button>
						)}
					</div>
				</div>

				<div
					className="flex gap-1 border-b px-2 py-1.5"
					role="tablist"
					aria-label="Group submissions by"
					data-testid="sidebar-grouping-select"
				>
					{MODES.map((m) => (
						<button
							key={m.key}
							type="button"
							role="tab"
							aria-selected={mode === m.key}
							onClick={() => setMode(m.key)}
							data-testid={`sidebar-grouping-${m.key}`}
							className={`flex-1 rounded px-2 py-1 text-[11px] font-medium transition-colors ${
								mode === m.key
									? "bg-muted text-foreground"
									: "text-muted-foreground hover:bg-muted/50"
							}`}
						>
							{m.label}
						</button>
					))}
				</div>

				<div className="flex-1 overflow-y-auto">
					{groups.length === 0 ? (
						<div className="flex flex-col items-center justify-center gap-1 p-6 text-center">
							{search ? (
								<p className="text-xs text-muted-foreground">No results</p>
							) : (
								<>
									<p className="text-xs font-medium text-muted-foreground">
										All scheduled
									</p>
									<p className="text-[11px] text-muted-foreground/70">
										Every accepted submission has been assigned to a session.
									</p>
								</>
							)}
						</div>
					) : (
						groups.map((group, gIdx) => {
							const isCollapsed =
								gIdx === 0
									? collapsed.set.has(group.key)
									: !collapsed.set.has(`open:${group.key}`);
							return (
								<div key={group.key} className="border-b last:border-b-0">
									<button
										type="button"
										onClick={() => {
											if (gIdx === 0) collapsed.toggle(group.key);
											else collapsed.toggle(`open:${group.key}`);
										}}
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
													selected={selection.selected.has(s.id)}
													expanded={expanded.set.has(s.id)}
													dragging={draggingId === s.id}
													onToggleSelect={(shift) =>
														selection.toggle(s.id, shift)
													}
													onToggleExpand={() => expanded.toggle(s.id)}
													onDragStart={() => setDraggingId(s.id)}
													onDragEnd={() => setDraggingId(null)}
												/>
											))}
										</ul>
									)}
								</div>
							);
						})
					)}
				</div>

				{selection.selected.size > 0 && (
					<div
						data-testid="sidebar-selection-bar"
						className="flex items-center gap-2 border-t bg-muted/40 px-2 py-2"
					>
						<span className="rounded-full bg-background px-2 py-0.5 text-[11px] font-medium">
							{selection.selected.size} selected
						</span>
						<button
							type="button"
							onClick={() => {
								onCreateSession?.(Array.from(selection.selected));
							}}
							data-testid="sidebar-bulk-create-session"
							className="rounded bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground hover:bg-primary/90"
						>
							+ Create session
						</button>
						<button
							type="button"
							onClick={selection.clear}
							className="ml-auto text-[11px] text-muted-foreground hover:text-foreground"
						>
							Clear
						</button>
					</div>
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
