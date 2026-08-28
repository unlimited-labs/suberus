import {
	IconBan,
	IconChevronDown,
	IconChevronUp,
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
import { InvitedTalkDialog } from "./invited-talk-dialog";
import { useSessionEditor } from "./session-editor-context";

const NO_BADGE = "none";

type InvitedTalkTarget = { mode: "add" } | { mode: "edit"; id: string } | null;

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

	const handleMove = (index: number, dir: "up" | "down") => {
		const reordered = [...presentations];
		const swap = dir === "up" ? index - 1 : index + 1;
		[reordered[index], reordered[swap]] = [reordered[swap], reordered[index]];
		mutations.reorderPresentations(reordered.map((p) => p.id));
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
				<div className="space-y-1">
					{presentations.map((p, i) => (
						<div
							className="flex items-center gap-2 rounded-md border px-2 py-1.5"
							data-testid={`session-editor-slot-${p.id}`}
							key={p.id}
						>
							<div className="flex flex-col">
								<Button
									disabled={i === 0}
									onClick={() => handleMove(i, "up")}
									size="icon-xs"
									variant="ghost"
								>
									<IconChevronUp size={11} />
								</Button>
								<Button
									disabled={i === presentations.length - 1}
									onClick={() => handleMove(i, "down")}
									size="icon-xs"
									variant="ghost"
								>
									<IconChevronDown size={11} />
								</Button>
							</div>
							<div className="min-w-0 flex-1">
								<p
									className={cn(
										"line-clamp-2 text-sm leading-snug",
										p.cancelled && "text-muted-foreground line-through",
									)}
								>
									{p.submissionTitle}
								</p>
								<p className="text-muted-foreground mt-0.5 truncate text-xs">
									{p.authors.length > 0
										? p.authors
												.map((a) => `${a.firstName} ${a.lastName}`)
												.join(", ")
										: "No authors"}
								</p>
							</div>
							{untimed ? (
								<span className="text-muted-foreground w-14 text-center text-xs tabular-nums">
									{String(i + 1).padStart(2, "0")}
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
							{p.invited && (
								<Button
									aria-label={`Edit ${p.submissionTitle}`}
									data-testid={`invited-talk-edit-${p.id}`}
									onClick={() => setInvitedTalk({ mode: "edit", id: p.id })}
									size="icon-sm"
									variant="ghost"
								>
									<IconPencil size={12} />
								</Button>
							)}
							<Button
								aria-label={`Remove ${p.submissionTitle}`}
								data-testid={`presentation-remove-${p.id}`}
								onClick={() => mutations.removePresentation(p.id)}
								size="icon-sm"
								variant="ghost"
							>
								<IconX size={12} />
							</Button>
						</div>
					))}
				</div>
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
