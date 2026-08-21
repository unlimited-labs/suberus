import {
	IconCalendarEvent,
	IconMapPin,
	IconStarFilled,
} from "@tabler/icons-react";
import { addMinutes } from "date-fns";
import type { KeyboardEvent } from "react";
import type {
	PublicProgramBreak,
	PublicProgramSession,
} from "@/features/planner/server/schedule";
import { formatClockTime } from "@/features/planner/tz-datetime";
import { cn } from "@/shared/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";
import { useProgramInteraction } from "./program-interaction";
import { Highlight } from "./themes/shared";

export const MARK = "rounded-[1px] bg-[var(--prog-mark)] text-foreground";

export function EventDetails({
	item,
	tz,
	titleClass,
}: {
	item: PublicProgramBreak;
	tz?: string;
	titleClass: string;
}) {
	return (
		<>
			<p className="flex items-center gap-2 font-[var(--prog-font-meta)] text-xs uppercase tracking-wide text-[var(--primary)]">
				<IconCalendarEvent className="size-3.5 shrink-0" />
				{formatClockTime(new Date(item.startAt), tz)} –{" "}
				{formatClockTime(new Date(item.endAt), tz)}
			</p>
			<p className={cn("mt-1 text-foreground", titleClass)}>{item.title}</p>
			{item.description && (
				<p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
					{item.description}
				</p>
			)}
			{item.location && (
				<p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
					<IconMapPin className="size-3.5 shrink-0" />
					{item.locationUrl ? (
						<a
							className="underline underline-offset-2 hover:text-foreground"
							href={item.locationUrl}
							rel="noopener noreferrer"
							target="_blank"
						>
							{item.location}
						</a>
					) : (
						item.location
					)}
				</p>
			)}
		</>
	);
}

function rowActivation(open: () => void) {
	return {
		role: "button" as const,
		tabIndex: 0,
		onClick: open,
		onKeyDown: (e: KeyboardEvent) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				open();
			}
		},
	};
}

export function SessionHeader({
	session,
	query,
	className,
	titleClassName,
	metaClassName,
	showDot = false,
	showRoom = true,
	chairAsLabel = false,
}: {
	session: PublicProgramSession;
	query: string;
	className?: string;
	titleClassName?: string;
	metaClassName?: string;
	showDot?: boolean;
	showRoom?: boolean;
	chairAsLabel?: boolean;
}) {
	const trackColor = session.track?.color ?? undefined;

	return (
		<header className={className}>
			<div
				className={cn(
					"flex flex-wrap items-center gap-x-2 gap-y-1 uppercase text-muted-foreground font-[var(--prog-font-meta)] tracking-[var(--prog-tracking)]",
					metaClassName,
				)}
			>
				{showDot && trackColor && (
					<span
						aria-hidden
						className="inline-block size-2.5 shrink-0 rounded-full"
						style={{ backgroundColor: trackColor }}
					/>
				)}
				{session.track && <span>{session.track.name}</span>}
				{showRoom && session.room && (
					<span className="sm:ml-auto">{session.room.name}</span>
				)}
			</div>
			<h3
				className={cn(
					"font-[var(--prog-font-display)] leading-tight text-foreground",
					titleClassName,
				)}
			>
				<Highlight markClassName={MARK} query={query} text={session.title} />
			</h3>
			{session.chairs.length > 0 && (
				<ChairLine asLabel={chairAsLabel} chairs={session.chairs} />
			)}
		</header>
	);
}

function ChairLine({
	chairs,
	asLabel,
}: {
	chairs: PublicProgramSession["chairs"];
	asLabel: boolean;
}) {
	const label = chairs.length > 1 ? "Chairs" : "Chair";
	const names = chairs
		.map((c) => [c.firstName, c.lastName].filter(Boolean).join(" "))
		.join(", ");

	if (asLabel) {
		return (
			<p className="mt-1 text-sm text-muted-foreground">
				<span className="font-[var(--prog-font-meta)] text-[9px] uppercase tracking-[var(--prog-tracking)] text-[var(--prog-faint)]">
					{label}
				</span>{" "}
				{names}
			</p>
		);
	}
	return (
		<p className="mt-1 text-sm text-muted-foreground">
			<span className="font-medium">{label}: </span>
			{names}
		</p>
	);
}

export function PresentationList({
	session,
	tz,
	query,
	numbered = false,
	className,
}: {
	session: PublicProgramSession;
	tz?: string;
	query: string;
	numbered?: boolean;
	className?: string;
}) {
	if (session.presentations.length === 0) return null;

	return (
		<ol className={cn("border-t border-border", className)}>
			{session.presentations.map((p, i) => {
				const offset = session.presentations
					.slice(0, i)
					.reduce((a, prev) => a + prev.durationMin, 0);
				const presStart = session.untimedSlots
					? new Date(session.startAt)
					: addMinutes(new Date(session.startAt), offset);
				return (
					<PresentationRow
						index={i}
						key={p.id}
						numbered={numbered || session.untimedSlots}
						presentation={p}
						presStart={presStart}
						query={query}
						session={session}
						tz={tz}
					/>
				);
			})}
		</ol>
	);
}

function PresentationRow({
	session,
	presentation: p,
	index,
	presStart,
	numbered,
	query,
	tz,
}: {
	session: PublicProgramSession;
	presentation: PublicProgramSession["presentations"][number];
	index: number;
	presStart: Date;
	numbered: boolean;
	query: string;
	tz?: string;
}) {
	const { canInteract, isFavorite, openPreview } = useProgramInteraction();
	const favorite = canInteract && isFavorite(p.id);
	const target = {
		slotId: p.id,
		submissionTitle: p.submissionTitle,
		sessionTitle: session.title,
		track: session.track,
		roomName: session.room?.name ?? null,
		startAtISO: presStart.toISOString(),
		untimedEndISO: session.untimedSlots
			? new Date(session.endAt).toISOString()
			: undefined,
		tz,
	};
	const open = () => openPreview(target);

	return (
		<li
			className={cn(
				"grid gap-x-3 border-b border-border py-3 last:border-0",
				numbered ? "grid-cols-[2.5rem_1fr]" : "grid-cols-[3.5rem_1fr]",
				"cursor-pointer transition-colors hover:bg-accent",
				!numbered && "-mx-2 rounded-md px-2",
			)}
			data-testid="presentation-row"
			{...rowActivation(open)}
		>
			<div>
				{numbered && (
					<span className="block font-[var(--prog-font-display)] text-xl leading-none tabular-nums text-[var(--prog-faint)]">
						{String(index + 1).padStart(2, "0")}
					</span>
				)}
				{!session.untimedSlots && (
					<span
						className={cn(
							"block tabular-nums",
							numbered
								? "mt-1 font-[var(--prog-font-meta)] text-[10px] uppercase tracking-[var(--prog-tracking)] text-[var(--prog-faint)]"
								: "text-sm font-medium text-muted-foreground",
						)}
					>
						{formatClockTime(presStart, tz)}
					</span>
				)}
			</div>
			<div className="min-w-0">
				<p
					className={cn(
						"flex items-start gap-1.5 leading-snug text-foreground font-[var(--prog-font-body)]",
						numbered ? "text-sm font-semibold" : "text-sm font-medium",
					)}
				>
					{favorite && (
						<IconStarFilled
							aria-label="Favorited"
							className="mt-0.5 size-3.5 shrink-0 text-amber-500"
							data-testid="favorited-star"
						/>
					)}
					{p.cancelled ? (
						<Tooltip>
							<TooltipTrigger asChild>
								<span className="text-[var(--prog-faint)] line-through decoration-2">
									<Highlight
										markClassName={MARK}
										query={query}
										text={p.submissionTitle}
									/>
								</span>
							</TooltipTrigger>
							<TooltipContent>Cancelled</TooltipContent>
						</Tooltip>
					) : (
						<span>
							<Highlight
								markClassName={MARK}
								query={query}
								text={p.submissionTitle}
							/>
						</span>
					)}
				</p>
				<RowAuthors
					authors={p.authors}
					onSelect={(orderIndex) =>
						openPreview(target, { authorOrderIndex: orderIndex })
					}
					query={query}
				/>
			</div>
		</li>
	);
}

function RowAuthors({
	authors,
	query,
	onSelect,
}: {
	authors: PublicProgramSession["presentations"][number]["authors"];
	query: string;
	onSelect: (orderIndex: number) => void;
}) {
	const { showAuthorInfo } = useProgramInteraction();
	if (authors.length === 0) return null;
	return (
		<p className="mt-0.5 text-[13px] leading-snug text-muted-foreground font-[var(--prog-font-body)]">
			{showAuthorInfo ? (
				authors.map((a, i) => (
					<span key={a.orderIndex}>
						{i > 0 && ", "}
						<button
							aria-label={`Author info: ${a.firstName} ${a.lastName}`}
							className="cursor-pointer underline-offset-2 hover:underline focus-visible:underline"
							data-testid="author-name"
							onClick={(e) => {
								e.stopPropagation();
								onSelect(a.orderIndex);
							}}
							onKeyDown={(e) => {
								if (e.key === "Enter" || e.key === " ") e.stopPropagation();
							}}
							type="button"
						>
							<Highlight
								markClassName={MARK}
								query={query}
								text={`${a.firstName} ${a.lastName}`}
							/>
						</button>
					</span>
				))
			) : (
				<Highlight
					markClassName={MARK}
					query={query}
					text={authors.map((a) => `${a.firstName} ${a.lastName}`).join(", ")}
				/>
			)}
		</p>
	);
}
