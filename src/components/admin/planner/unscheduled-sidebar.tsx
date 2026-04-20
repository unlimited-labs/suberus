import {
	IconBook,
	IconChevronDown,
	IconChevronLeft,
	IconChevronRight,
	IconGripVertical,
	IconLayoutList,
	IconSearch,
	IconX,
} from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { unscheduledSubmissionsQueryOptions } from "@/utils/program-sessions.functions";
import type { UnscheduledSubmission } from "@/utils/program-sessions.server";
import { BulkReadReader } from "./bulk-read-reader";
import {
	type GroupingMode,
	groupSubmissions,
	matchesSearch,
} from "./session-grouper";

const TYPE_LABELS: Record<string, string> = {
	ABSTRACT: "Oral",
	FULL_PAPER: "Paper",
	POSTER: "Poster",
};

const MODES: Array<{ key: GroupingMode; label: string }> = [
	{ key: "intake", label: "Intake" },
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
	const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
	const [selected, setSelected] = useState<Set<string>>(() => new Set());
	const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
	const [lastAnchor, setLastAnchor] = useState<string | null>(null);
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

	const toggleSelect = (id: string, shift: boolean) => {
		setSelected((prev) => {
			const next = new Set(prev);
			if (shift && lastAnchor) {
				const a = flatIds.indexOf(lastAnchor);
				const b = flatIds.indexOf(id);
				if (a >= 0 && b >= 0) {
					const [from, to] = a < b ? [a, b] : [b, a];
					for (let i = from; i <= to; i++) next.add(flatIds[i]);
					return next;
				}
			}
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
		setLastAnchor(id);
	};

	const toggleGroup = (key: string) =>
		setCollapsed((prev) => {
			const next = new Set(prev);
			if (next.has(key)) next.delete(key);
			else next.add(key);
			return next;
		});

	const toggleExpand = (id: string) =>
		setExpanded((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});

	if (!open) {
		return (
			<div className="flex flex-col items-center border-r bg-muted/30 pt-3">
				<button
					type="button"
					onClick={() => setOpen(true)}
					className="flex flex-col items-center gap-1 rounded px-2 py-2 text-muted-foreground hover:bg-muted hover:text-foreground"
					title="Unscheduled submissions"
					aria-label={`Open unscheduled submissions panel (${submissions.length})`}
				>
					<IconLayoutList size={16} />
					<span className="text-[10px] font-medium uppercase tracking-wide [writing-mode:vertical-rl]">
						Unscheduled ({submissions.length})
					</span>
				</button>
				<button
					type="button"
					onClick={() => setOpen(true)}
					className="mt-2 rounded p-1 text-muted-foreground hover:bg-muted"
				>
					<IconChevronRight size={14} />
				</button>
			</div>
		);
	}

	return (
		<>
			<div className="flex min-h-0 w-72 shrink-0 flex-col border-r">
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
				>
					{MODES.map((m) => (
						<button
							key={m.key}
							type="button"
							role="tab"
							aria-selected={mode === m.key}
							onClick={() => setMode(m.key)}
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
									? collapsed.has(group.key)
									: !collapsed.has(`open:${group.key}`);
							return (
								<div key={group.key} className="border-b last:border-b-0">
									<button
										type="button"
										onClick={() => {
											if (gIdx === 0) toggleGroup(group.key);
											else toggleGroup(`open:${group.key}`);
										}}
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
													selected={selected.has(s.id)}
													expanded={expanded.has(s.id)}
													dragging={draggingId === s.id}
													onToggleSelect={(shift) => toggleSelect(s.id, shift)}
													onToggleExpand={() => toggleExpand(s.id)}
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

				{selected.size > 0 && (
					<div className="flex items-center gap-2 border-t bg-muted/40 px-2 py-2">
						<span className="rounded-full bg-background px-2 py-0.5 text-[11px] font-medium">
							{selected.size} selected
						</span>
						<button
							type="button"
							onClick={() => {
								onCreateSession?.(Array.from(selected));
							}}
							className="rounded bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground hover:bg-primary/90"
						>
							+ Create session
						</button>
						<button
							type="button"
							onClick={() => setSelected(new Set())}
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

interface RowProps {
	submission: UnscheduledSubmission;
	selected: boolean;
	expanded: boolean;
	dragging: boolean;
	onToggleSelect: (shift: boolean) => void;
	onToggleExpand: () => void;
	onDragStart: () => void;
	onDragEnd: () => void;
}

function SubmissionRow({
	submission: s,
	selected,
	expanded,
	dragging,
	onToggleSelect,
	onToggleExpand,
	onDragStart,
	onDragEnd,
}: RowProps) {
	const [leaving, setLeaving] = useState(false);
	const authors = s.authors
		.slice(0, 3)
		.map((a) => `${a.firstName} ${a.lastName}`)
		.join(", ");
	const more = s.authors.length > 3 ? ` +${s.authors.length - 3}` : "";

	return (
		<li
			draggable
			onDragStart={(e) => {
				e.dataTransfer.setData("submissionid", s.id);
				e.dataTransfer.effectAllowed = "copy";
				onDragStart();
			}}
			onDragEnd={(e) => {
				if (e.dataTransfer.dropEffect !== "none") setLeaving(true);
				onDragEnd();
			}}
			className={`group flex cursor-grab items-start gap-1.5 px-2 py-2 transition-all duration-200 ease-out hover:bg-muted/40 active:cursor-grabbing ${
				dragging ? "opacity-40" : ""
			} ${selected ? "bg-primary/5" : ""} ${
				leaving
					? "pointer-events-none max-h-0 -translate-x-4 overflow-hidden py-0 opacity-0"
					: "max-h-60"
			}`}
		>
			<input
				type="checkbox"
				aria-label={`Select ${s.title}`}
				checked={selected}
				onChange={() => onToggleSelect(false)}
				onClick={(e) => {
					e.stopPropagation();
					if (e.shiftKey) {
						e.preventDefault();
						onToggleSelect(true);
					}
				}}
				className="mt-1 shrink-0 accent-primary"
			/>
			<IconGripVertical
				size={12}
				className="mt-1 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground"
			/>
			<div className="min-w-0 flex-1">
				<button
					type="button"
					onClick={onToggleExpand}
					className="block w-full text-left"
				>
					<div className="flex items-start gap-1.5">
						<span className="mt-0.5 shrink-0 rounded bg-muted px-1 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
							{TYPE_LABELS[s.type] ?? s.type}
						</span>
						<p
							className={`text-xs font-medium leading-snug ${
								expanded ? "" : "line-clamp-2"
							}`}
						>
							{s.title}
						</p>
					</div>
					{s.authors.length > 0 && (
						<p className="mt-0.5 truncate text-[11px] text-muted-foreground">
							{authors}
							{more}
						</p>
					)}
				</button>
				{expanded && (
					<div className="mt-2 space-y-1.5">
						{s.abstract && (
							<p className="line-clamp-6 text-[11px] leading-relaxed text-muted-foreground">
								{s.abstract}
							</p>
						)}
						{s.keywords.length > 0 && (
							<div className="flex flex-wrap gap-1">
								{s.keywords.map((k) => (
									<span
										key={k.id}
										className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
									>
										{k.name}
									</span>
								))}
							</div>
						)}
						{s.trackName && (
							<p className="text-[10px] text-muted-foreground">
								Intake: {s.trackName}
							</p>
						)}
					</div>
				)}
			</div>
		</li>
	);
}
