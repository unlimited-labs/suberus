import { IconStarFilled } from "@tabler/icons-react";
import { addMinutes } from "date-fns";
import type { PublicProgramSession } from "@/features/planner/server/schedule";
import { formatClockTime } from "@/features/planner/tz-datetime";
import { cn } from "@/shared/lib/utils";
import { useProgramInteraction } from "./program-interaction";
import { Highlight } from "./themes/shared";

export const MARK = "rounded-[1px] bg-[var(--prog-mark)] text-foreground";

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
	const chairLabel = session.chairs.length > 1 ? "Chairs" : "Chair";
	const chairNames = session.chairs
		.map((c) => [c.firstName, c.lastName].filter(Boolean).join(" "))
		.join(", ");

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
			{session.chairs.length > 0 &&
				(chairAsLabel ? (
					<p className="mt-1 text-sm text-muted-foreground">
						<span className="font-[var(--prog-font-meta)] text-[9px] uppercase tracking-[var(--prog-tracking)] text-[var(--prog-faint)]">
							{chairLabel}
						</span>{" "}
						{chairNames}
					</p>
				) : (
					<p className="mt-1 text-sm text-muted-foreground">
						<span className="font-medium">{chairLabel}: </span>
						{chairNames}
					</p>
				))}
		</header>
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
	const { canInteract, isFavorite, openPreview } = useProgramInteraction();

	if (session.presentations.length === 0) return null;

	return (
		<ol className={cn("border-t border-border", className)}>
			{session.presentations.map((p, i) => {
				const offset = session.presentations
					.slice(0, i)
					.reduce((a, prev) => a + prev.durationMin, 0);
				const presStart = addMinutes(new Date(session.startAt), offset);
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
						key={p.id}
						data-testid="presentation-row"
						className={cn(
							"grid gap-x-3 border-b border-border py-3 last:border-0",
							numbered ? "grid-cols-[2.5rem_1fr]" : "grid-cols-[3.5rem_1fr]",
							canInteract && "cursor-pointer transition-colors hover:bg-accent",
							!numbered && canInteract && "-mx-2 rounded-md px-2",
						)}
						{...(canInteract
							? {
									role: "button",
									tabIndex: 0,
									onClick: open,
									onKeyDown: (e) => {
										if (e.key === "Enter" || e.key === " ") {
											e.preventDefault();
											open();
										}
									},
								}
							: {})}
					>
						<div>
							{numbered && (
								<span className="block font-[var(--prog-font-display)] text-xl leading-none tabular-nums text-[var(--prog-faint)]">
									{String(i + 1).padStart(2, "0")}
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
			})}
		</ol>
	);
}
