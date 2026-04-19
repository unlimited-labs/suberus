import {
	IconChevronLeft,
	IconChevronRight,
	IconGripVertical,
	IconLayoutList,
	IconSearch,
	IconX,
} from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { unscheduledSubmissionsQueryOptions } from "@/utils/program-sessions.functions";

const TYPE_LABELS: Record<string, string> = {
	ABSTRACT: "Abstract",
	FULL_PAPER: "Paper",
	POSTER: "Poster",
};

export function UnscheduledSidebar() {
	const { data: submissions } = useSuspenseQuery(
		unscheduledSubmissionsQueryOptions(),
	);
	const [open, setOpen] = useState(true);
	const [search, setSearch] = useState("");
	const [draggingId, setDraggingId] = useState<string | null>(null);

	const filtered = search.trim()
		? submissions.filter((s) => {
				const q = search.toLowerCase();
				if (s.title.toLowerCase().includes(q)) return true;
				return s.authors.some(
					(a) =>
						a.firstName.toLowerCase().includes(q) ||
						a.lastName.toLowerCase().includes(q),
				);
			})
		: submissions;

	const authorLine = (
		authors: Array<{ firstName: string; lastName: string }>,
	) =>
		authors
			.slice(0, 3)
			.map((a) => `${a.firstName} ${a.lastName}`)
			.join(", ") + (authors.length > 3 ? ` +${authors.length - 3}` : "");

	if (!open) {
		return (
			<div className="flex flex-col items-center border-r bg-muted/30 pt-3">
				<button
					type="button"
					onClick={() => setOpen(true)}
					className="flex flex-col items-center gap-1 rounded px-2 py-2 text-muted-foreground hover:bg-muted hover:text-foreground"
					title="Unscheduled submissions"
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
		<div className="flex min-h-0 w-64 shrink-0 flex-col border-r">
			{/* Header */}
			<div className="flex items-center justify-between border-b px-3 py-2">
				<div className="flex items-center gap-1.5">
					<IconLayoutList size={14} className="text-muted-foreground" />
					<span className="text-xs font-medium">Unscheduled</span>
					<span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
						{submissions.length}
					</span>
				</div>
				<button
					type="button"
					onClick={() => setOpen(false)}
					className="rounded p-1 text-muted-foreground hover:bg-muted"
				>
					<IconChevronLeft size={14} />
				</button>
			</div>

			{/* Search */}
			<div className="border-b px-2 py-2">
				<div className="relative">
					<IconSearch
						size={12}
						className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
					/>
					<Input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Search..."
						className="h-7 pl-7 text-xs"
					/>
					{search && (
						<button
							type="button"
							onClick={() => setSearch("")}
							className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
						>
							<IconX size={11} />
						</button>
					)}
				</div>
			</div>

			{/* Hint */}
			{submissions.length > 0 && (
				<p className="border-b px-3 py-1.5 text-[10px] text-muted-foreground/70">
					Drag onto a session to assign
				</p>
			)}

			{/* List */}
			<div className="flex-1 overflow-y-auto">
				{filtered.length === 0 ? (
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
					<ul className="divide-y">
						{filtered.map((s) => (
							<li
								key={s.id}
								draggable
								onDragStart={(e) => {
									e.dataTransfer.setData("submissionid", s.id);
									e.dataTransfer.effectAllowed = "copy";
									setDraggingId(s.id);
								}}
								onDragEnd={() => setDraggingId(null)}
								className={`group flex cursor-grab items-start gap-1.5 px-2 py-2.5 hover:bg-muted/50 active:cursor-grabbing ${
									draggingId === s.id ? "opacity-40" : ""
								}`}
							>
								<IconGripVertical
									size={12}
									className="mt-0.5 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground"
								/>
								<span className="mt-0.5 shrink-0 rounded bg-muted px-1 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
									{TYPE_LABELS[s.type] ?? s.type}
								</span>
								<div className="min-w-0 flex-1">
									<p className="line-clamp-2 text-xs font-medium leading-snug">
										{s.title}
									</p>
									{s.authors.length > 0 && (
										<p className="mt-0.5 truncate text-[11px] text-muted-foreground">
											{authorLine(s.authors)}
										</p>
									)}
								</div>
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	);
}
