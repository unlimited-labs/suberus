import { IconMapPin } from "@tabler/icons-react";
import type { ProgramSessionDetail } from "@/features/planner/server/sessions";
import {
	formatClockTime,
	formatDayLabel,
} from "@/features/planner/tz-datetime";

interface Props {
	sessions: ProgramSessionDetail[];
	search: string;
	timezone: string | undefined;
	onOpenSession: (sessionId: string) => void;
}

export function ScheduledList({
	sessions,
	search,
	timezone,
	onOpenSession,
}: Props) {
	const q = search.trim().toLowerCase();
	const filteredSessions = sessions.flatMap((s) => {
		const presentations = q
			? s.presentations.filter((p) => {
					const authors = p.authors
						.map((a) => `${a.firstName} ${a.lastName}`)
						.join(" ")
						.toLowerCase();
					return (
						p.submissionTitle.toLowerCase().includes(q) ||
						authors.includes(q) ||
						s.title.toLowerCase().includes(q)
					);
				})
			: s.presentations;
		return presentations.length > 0 ? [{ ...s, presentations }] : [];
	});

	if (filteredSessions.length === 0) {
		return (
			<div
				className="p-6 text-center text-xs text-muted-foreground"
				data-testid="scheduled-empty"
			>
				{q
					? "No scheduled presentations match your search."
					: "No presentations scheduled yet."}
			</div>
		);
	}

	return (
		<ul className="divide-y" data-testid="scheduled-list">
			{filteredSessions.map((s) => {
				const day = formatDayLabel(s.startAt, timezone);
				const start = formatClockTime(s.startAt, timezone);
				const end = formatClockTime(s.endAt, timezone);
				const room = s.room?.name ?? "No room";
				return (
					<li
						key={s.id}
						data-testid={`scheduled-session-${s.id}`}
						className="px-3 py-2"
					>
						<button
							type="button"
							onClick={() => onOpenSession(s.id)}
							className="mb-1 block w-full text-left hover:text-primary"
						>
							<p className="truncate text-xs font-semibold">{s.title}</p>
							<div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
								<span>{day}</span>
								<span>·</span>
								<span>
									{start}–{end}
								</span>
								<span>·</span>
								<span className="flex items-center gap-0.5">
									<IconMapPin size={9} />
									{room}
								</span>
							</div>
						</button>
						<ul className="space-y-0.5 pl-2">
							{s.presentations.map((p) => {
								const authors = p.authors
									.slice(0, 2)
									.map((a) => `${a.firstName} ${a.lastName}`)
									.join(", ");
								const more =
									p.authors.length > 2 ? ` +${p.authors.length - 2}` : "";
								return (
									<li
										key={p.id}
										data-testid={`scheduled-row-${p.submissionId}`}
										className="border-l-2 border-muted pl-2"
									>
										<button
											type="button"
											onClick={() => onOpenSession(s.id)}
											className="block w-full text-left hover:text-primary"
										>
											<p className="line-clamp-2 text-[11px] leading-snug">
												{p.submissionTitle}
											</p>
											{authors && (
												<p className="mt-0.5 truncate text-[10px] text-muted-foreground">
													{authors}
													{more}
												</p>
											)}
										</button>
									</li>
								);
							})}
						</ul>
					</li>
				);
			})}
		</ul>
	);
}
