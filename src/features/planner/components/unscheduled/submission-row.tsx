import { IconDownload, IconGripVertical } from "@tabler/icons-react";
import { useState } from "react";
import {
	formatAuthorsSummary,
	submissionRowClassName,
	typeLabel,
} from "@/features/planner/components/unscheduled/submission-row-helpers";
import type { UnscheduledSubmission } from "@/features/planner/server/sessions";
import { cn } from "@/shared/lib/utils";

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

function SubmissionRowHeader({
	title,
	type,
	showTypeBadge,
	expanded,
	authorsSummary,
	hasAuthors,
	onToggleExpand,
}: {
	title: string;
	type: string;
	showTypeBadge: boolean;
	expanded: boolean;
	authorsSummary: string;
	hasAuthors: boolean;
	onToggleExpand: () => void;
}) {
	return (
		<button
			className="block w-full text-left"
			onClick={onToggleExpand}
			type="button"
		>
			<div className="flex items-start gap-1.5">
				{showTypeBadge && (
					<span className="bg-muted text-muted-foreground mt-0.5 shrink-0 rounded px-1 py-0.5 text-[9px] font-medium tracking-wide uppercase">
						{typeLabel(type)}
					</span>
				)}
				<p
					className={cn(
						"text-xs font-medium leading-snug",
						!expanded && "line-clamp-2",
					)}
				>
					{title}
				</p>
			</div>
			{hasAuthors && (
				<p className="text-muted-foreground mt-0.5 truncate text-[11px]">
					{authorsSummary}
				</p>
			)}
		</button>
	);
}

function SubmissionKeywords({
	keywords,
}: {
	keywords: UnscheduledSubmission["keywords"];
}) {
	if (keywords.length === 0) return null;
	return (
		<div className="flex flex-wrap gap-1">
			{keywords.map((k) => (
				<span
					className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10px]"
					key={k.id}
				>
					{k.name}
				</span>
			))}
		</div>
	);
}

function SubmissionRowDetails({ s }: { s: UnscheduledSubmission }) {
	return (
		<div className="mt-2 space-y-1.5">
			{s.abstract && (
				<p className="text-muted-foreground line-clamp-6 text-[11px] leading-relaxed">
					{s.abstract}
				</p>
			)}
			{s.file && (
				<a
					className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px]"
					data-testid={`unscheduled-download-${s.id}`}
					download={s.file.originalName}
					href={`/api/files/${s.file.id}`}
					onClick={(e) => e.stopPropagation()}
				>
					<IconDownload size={10} />
					<span className="max-w-[180px] truncate">{s.file.originalName}</span>
				</a>
			)}
			<SubmissionKeywords keywords={s.keywords} />
			{s.trackName && (
				<p className="text-muted-foreground text-[10px]">
					Intake: {s.trackName}
				</p>
			)}
		</div>
	);
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

	return (
		<li
			className={submissionRowClassName({ dragging, selected, leaving })}
			data-testid={`unscheduled-row-${s.id}`}
			draggable
			onDoubleClick={onOpenReader}
			onDragEnd={(e) => {
				if (e.dataTransfer.dropEffect !== "none") setLeaving(true);
				onDragEnd();
			}}
			onDragStart={(e) => {
				e.dataTransfer.setData("submissionid", s.id);
				e.dataTransfer.effectAllowed = "copy";
				onDragStart();
			}}
		>
			{selectMode && (
				<input
					aria-label={`Select ${s.title}`}
					checked={selected}
					className="accent-primary mt-1 shrink-0"
					onChange={() => onToggleSelect(false)}
					onClick={(e) => {
						e.stopPropagation();
						if (e.shiftKey) {
							e.preventDefault();
							onToggleSelect(true);
						}
					}}
					type="checkbox"
				/>
			)}
			<IconGripVertical
				className="text-muted-foreground/40 group-hover:text-muted-foreground mt-1 shrink-0"
				size={12}
			/>
			<div className="min-w-0 flex-1">
				<SubmissionRowHeader
					authorsSummary={formatAuthorsSummary(s.authors)}
					expanded={expanded}
					hasAuthors={s.authors.length > 0}
					onToggleExpand={onToggleExpand}
					showTypeBadge={showTypeBadge}
					title={s.title}
					type={s.type}
				/>
				{expanded && <SubmissionRowDetails s={s} />}
			</div>
		</li>
	);
}
