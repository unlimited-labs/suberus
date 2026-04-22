import { IconDownload, IconGripVertical } from "@tabler/icons-react";
import { useState } from "react";
import type { UnscheduledSubmission } from "@/lib/server/planner/sessions";

const TYPE_LABELS: Record<string, string> = {
	ABSTRACT: "Oral",
	FULL_PAPER: "Paper",
	POSTER: "Poster",
};

interface Props {
	submission: UnscheduledSubmission;
	selectMode: boolean;
	showTypeBadge: boolean;
	selected: boolean;
	expanded: boolean;
	dragging: boolean;
	onToggleSelect: (shift: boolean) => void;
	onToggleExpand: () => void;
	onOpenReader: () => void;
	onDragStart: () => void;
	onDragEnd: () => void;
}

export function SubmissionRow({
	submission: s,
	selectMode,
	showTypeBadge,
	selected,
	expanded,
	dragging,
	onToggleSelect,
	onToggleExpand,
	onOpenReader,
	onDragStart,
	onDragEnd,
}: Props) {
	const [leaving, setLeaving] = useState(false);
	const authors = s.authors
		.slice(0, 3)
		.map((a) => `${a.firstName} ${a.lastName}`)
		.join(", ");
	const more = s.authors.length > 3 ? ` +${s.authors.length - 3}` : "";

	return (
		<li
			data-testid={`unscheduled-row-${s.id}`}
			draggable
			onDoubleClick={onOpenReader}
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
			{selectMode && (
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
			)}
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
						{showTypeBadge && (
							<span className="mt-0.5 shrink-0 rounded bg-muted px-1 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
								{TYPE_LABELS[s.type] ?? s.type}
							</span>
						)}
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
						{s.file && (
							<a
								href={`/api/files/${s.file.id}`}
								download={s.file.originalName}
								onClick={(e) => e.stopPropagation()}
								data-testid={`unscheduled-download-${s.id}`}
								className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
							>
								<IconDownload size={10} />
								<span className="max-w-[180px] truncate">
									{s.file.originalName}
								</span>
							</a>
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
