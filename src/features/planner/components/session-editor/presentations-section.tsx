import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	arrayMove,
	SortableContext,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
	IconBan,
	IconGripVertical,
	IconPencil,
	IconPlus,
	IconX,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { adminSettingQueryOptions } from "@/features/settings/api/settings";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";
import { InvitedTalkDialog } from "./invited-talk-dialog";
import { useSessionEditor } from "./session-editor-context";

const NO_BADGE = "none";

const REORDER_INSTRUCTIONS = {
	draggable:
		"Focus a presentation's reorder handle, then press the up or down arrow key to move it. Or drag it with the pointer.",
};

type InvitedTalkTarget = { mode: "add" } | { mode: "edit"; id: string } | null;

type Presentation = ReturnType<
	typeof useSessionEditor
>["sortedPresentations"][number];

type Badge = { id: string; label: string };

interface PresentationRowProps {
	presentation: Presentation;
	index: number;
	untimed: boolean;
	badges: Badge[] | undefined;
	onEditInvited: (id: string) => void;
	onMove: (offset: number) => void;
}

function PresentationRow({
	presentation: p,
	index,
	untimed,
	badges,
	onEditInvited,
	onMove,
}: PresentationRowProps) {
	const { mutations } = useSessionEditor();
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: p.id });

	return (
		<div
			className={cn(
				"flex items-start gap-2 rounded-md border p-2",
				isDragging && "relative z-10 opacity-80 shadow-lg",
			)}
			data-testid={`session-editor-slot-${p.id}`}
			ref={setNodeRef}
			style={{ transform: CSS.Transform.toString(transform), transition }}
		>
			<button
				aria-label={`Reorder ${p.submissionTitle}`}
				className="text-muted-foreground hover:text-foreground mt-0.5 cursor-grab touch-none active:cursor-grabbing"
				onKeyDown={(e) => {
					// Arrow keys never reach dnd-kit's document listener inside the sheet.
					const offset =
						e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0;
					if (!offset) return;
					e.preventDefault();
					onMove(offset);
				}}
				type="button"
				{...attributes}
				{...listeners}
			>
				<IconGripVertical size={14} />
			</button>

			<div className="min-w-0 flex-1">
				<p
					className={cn(
						"text-sm leading-snug",
						p.cancelled && "text-muted-foreground line-through",
					)}
				>
					{p.submissionTitle}
				</p>
				<p className="text-muted-foreground mt-0.5 truncate text-xs">
					{p.authors.length > 0
						? p.authors.map((a) => `${a.firstName} ${a.lastName}`).join(", ")
						: "No authors"}
				</p>
				<div className="mt-1.5 flex flex-wrap items-center gap-2">
					{untimed ? (
						<span className="text-muted-foreground text-xs tabular-nums">
							#{String(index + 1).padStart(2, "0")}
						</span>
					) : (
						<div className="flex items-center gap-1">
							<Input
								aria-label={`Duration of ${p.submissionTitle}`}
								className="h-7 w-14 px-1.5 text-center text-xs tabular-nums"
								defaultValue={p.durationMin}
								key={`${p.id}:${p.durationMin}`}
								min={1}
								onBlur={(e) => {
									const v = Number(e.target.value);
									if (v > 0 && v !== p.durationMin) {
										mutations.updatePresentationDuration(p.id, v);
									}
								}}
								step={5}
								type="number"
							/>
							<span className="text-muted-foreground text-[10px]">min</span>
						</div>
					)}
					{badges && badges.length > 0 && (
						<Select
							items={[
								{ value: NO_BADGE, label: "No badge" },
								...badges.map((b) => ({ value: b.id, label: b.label })),
							]}
							onValueChange={(value) =>
								mutations.setBadge(
									p.id,
									value === NO_BADGE || value === null ? null : value,
								)
							}
							value={p.badgeId ?? NO_BADGE}
						>
							<SelectTrigger
								aria-label={`Badge of ${p.submissionTitle}`}
								className="h-7 w-28 text-xs"
								data-testid={`presentation-badge-${p.id}`}
							>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={NO_BADGE}>No badge</SelectItem>
								{badges.map((b) => (
									<SelectItem key={b.id} value={b.id}>
										{b.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								aria-label={
									p.cancelled
										? `Restore ${p.submissionTitle}`
										: `Cancel ${p.submissionTitle}`
								}
								aria-pressed={p.cancelled}
								className={cn(p.cancelled && "text-destructive")}
								data-testid={`presentation-cancel-${p.id}`}
								onClick={() => mutations.setCancelled(p.id, !p.cancelled)}
								size="icon-sm"
								variant="ghost"
							>
								<IconBan size={12} />
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							{p.cancelled
								? "Restore this presentation"
								: "Cancel this presentation - it stays in the programme, shown struck through"}
						</TooltipContent>
					</Tooltip>
					{p.invited && (
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									aria-label={`Edit ${p.submissionTitle}`}
									data-testid={`invited-talk-edit-${p.id}`}
									onClick={() => onEditInvited(p.id)}
									size="icon-sm"
									variant="ghost"
								>
									<IconPencil size={12} />
								</Button>
							</TooltipTrigger>
							<TooltipContent>Edit invited talk</TooltipContent>
						</Tooltip>
					)}
				</div>
			</div>

			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						aria-label={`Remove ${p.submissionTitle}`}
						data-testid={`presentation-remove-${p.id}`}
						onClick={() => mutations.removePresentation(p.id)}
						size="icon-sm"
						variant="ghost"
					>
						<IconX size={12} />
					</Button>
				</TooltipTrigger>
				<TooltipContent>
					{p.invited
						? "Delete this invited talk"
						: "Remove from this session - the abstract returns to the unscheduled queue"}
				</TooltipContent>
			</Tooltip>
		</div>
	);
}

export function PresentationsSection() {
	const {
		session,
		sortedPresentations: presentations,
		usedMin,
		sessionDurationMin,
		mutations,
	} = useSessionEditor();
	const untimed = session.untimedSlots;
	const remainingMin = sessionDurationMin - usedMin;
	const capacityFull = usedMin >= sessionDurationMin;
	const [invitedTalk, setInvitedTalk] = useState<InvitedTalkTarget>(null);
	const { data: badges } = useQuery(adminSettingQueryOptions("PROGRAM_BADGES"));

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
	);

	const move = (from: number, to: number) => {
		if (to < 0 || to >= presentations.length || from === to) return;
		mutations.reorderPresentations(
			arrayMove(presentations, from, to).map((p) => p.id),
		);
	};

	const handleDragEnd = ({ active, over }: DragEndEvent) => {
		if (!over || active.id === over.id) return;
		move(
			presentations.findIndex((p) => p.id === active.id),
			presentations.findIndex((p) => p.id === over.id),
		);
	};

	return (
		<div className="space-y-2 p-4">
			<div className="flex items-center justify-between">
				<Label className="text-sm font-medium">
					Presentations{" "}
					<span className="text-muted-foreground font-normal">
						({presentations.length})
					</span>
				</Label>
				<div className="flex items-center gap-2">
					{untimed ? (
						<span className="text-muted-foreground text-xs">Untimed</span>
					) : (
						<span
							className={`text-xs tabular-nums ${capacityFull ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}
						>
							{usedMin}/{sessionDurationMin} min
							{!capacityFull && remainingMin > 0 && (
								<span className="opacity-60"> · {remainingMin} free</span>
							)}
						</span>
					)}
					<Button
						data-testid="add-invited-talk"
						disabled={!untimed && capacityFull}
						onClick={() => setInvitedTalk({ mode: "add" })}
						size="xs"
						variant="outline"
					>
						<IconPlus size={12} />
						Invited talk
					</Button>
				</div>
			</div>

			{presentations.length === 0 ? (
				<p className="text-muted-foreground text-xs">
					No presentations assigned
				</p>
			) : (
				<DndContext
					accessibility={{ screenReaderInstructions: REORDER_INSTRUCTIONS }}
					collisionDetection={closestCenter}
					onDragEnd={handleDragEnd}
					sensors={sensors}
				>
					<SortableContext
						items={presentations.map((p) => p.id)}
						strategy={verticalListSortingStrategy}
					>
						<div className="space-y-1">
							{presentations.map((p, i) => (
								<PresentationRow
									badges={badges}
									index={i}
									key={p.id}
									onEditInvited={(id) => setInvitedTalk({ mode: "edit", id })}
									onMove={(offset) => move(i, i + offset)}
									presentation={p}
									untimed={untimed}
								/>
							))}
						</div>
					</SortableContext>
				</DndContext>
			)}

			{invitedTalk && (
				<InvitedTalkDialog
					onOpenChange={(o) => !o && setInvitedTalk(null)}
					open
					sessionId={session.id}
					slotId={invitedTalk.mode === "edit" ? invitedTalk.id : undefined}
					untimed={untimed}
				/>
			)}
		</div>
	);
}
