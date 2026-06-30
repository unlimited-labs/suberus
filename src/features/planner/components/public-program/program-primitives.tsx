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
							href={item.locationUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="underline underline-offset-2 hover:text-foreground"
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

function rowActivation(active: boolean, open: () => void) {
	if (!active) return {};
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
						className="inline-block size-2.5 shrink-0 rounded-full"
						style={{ backgroundColor: trackColor }}
						aria-hidden
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
				<Highlight text={session.title} query={query} markClassName={MARK} />
			</h3>
			{session.chairs.length > 0 && (
				<ChairLine chairs={session.chairs} asLabel={chairAsLabel} />
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
				const presStart = addMinutes(new Date(session.startAt), offset);
				return (
					<PresentationRow
						key={p.id}
						session={session}
						presentation={p}
						index={i}
						presStart={presStart}
						numbered={numbered}
						query={query}
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
	const open = () =>
		openPreview({
			slotId: p.id,
			submissionTitle: p.submissionTitle,
			sessionTitle: session.title,
			track: session.track,
			roomName: session.room?.name ?? null,
			startAtISO: presStart.toISOString(),
			tz,
		});

	return (
		<li
			data-testid="presentation-row"
			className={cn(
				"grid gap-x-3 border-b border-border py-3 last:border-0",
				numbered ? "grid-cols-[2.5rem_1fr]" : "grid-cols-[3.5rem_1fr]",
				canInteract && "cursor-pointer transition-colors hover:bg-accent",
				!numbered && canInteract && "-mx-2 rounded-md px-2",
			)}
			{...rowActivation(canInteract, open)}
		>
			<div>
				{numbered && (
					<span className="block font-[var(--prog-font-display)] text-xl leading-none tabular-nums text-[var(--prog-faint)]">
						{String(index + 1).padStart(2, "0")}
					</span>
				)}
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
							data-testid="favorited-star"
							className="mt-0.5 size-3.5 shrink-0 text-amber-500"
							aria-label="Favorited"
						/>
					)}
					<span>
						<Highlight
							text={p.submissionTitle}
							query={query}
							markClassName={MARK}
						/>
					</span>
				</p>
				{p.authors.length > 0 && (
					<p className="mt-0.5 text-[13px] leading-snug text-muted-foreground font-[var(--prog-font-body)]">
						<Highlight
							text={p.authors
								.map((a) => `${a.firstName} ${a.lastName}`)
								.join(", ")}
							query={query}
							markClassName={MARK}
						/>
					</p>
				)}
			</div>
		</li>
	);
}
