import { IconSpeakerphone } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { myAnnouncementsQueryOptions } from "@/features/announcements/api/announcements";
import { useDateFormat } from "@/shared/hooks/use-date-format";
import { cn } from "@/shared/lib/utils";
import { SectionCard } from "@/shared/ui/section-card";
import { AnnouncementDialog } from "./announcement-dialog";

const DAY_MS = 24 * 60 * 60 * 1000;
const RELATIVE_DAYS = 7;

function relativeDays(date: Date, now: number): string | null {
	const days = Math.floor((now - date.getTime()) / DAY_MS);
	if (days >= RELATIVE_DAYS || days < 0) return null;
	if (days === 0) return "Today";
	if (days === 1) return "Yesterday";
	return `${days} days ago`;
}

export function AnnouncementInboxCard() {
	const { data } = useQuery(myAnnouncementsQueryOptions());
	const { formatDate } = useDateFormat();
	const [openId, setOpenId] = useState<string | null>(null);
	// Read once at mount, not on every render: Date.now() during render is impure
	// and blocks the compiler. "Today" not ageing mid-session is the right trade.
	const [now] = useState(() => Date.now());

	if (!data || data.length === 0) return null;

	const unread = data.filter((a) => a.readAt === null).length;

	return (
		<>
			<SectionCard
				action={
					unread > 0 ? (
						<span
							className="text-muted-foreground text-sm tabular-nums"
							data-testid="announcement-unread-count"
						>
							{unread} unread
						</span>
					) : null
				}
				icon={IconSpeakerphone}
				title="Announcements"
			>
				<ul className="-my-1 divide-y" data-testid="announcement-inbox">
					{data.map((a) => {
						const isUnread = a.readAt === null;
						const published = a.publishedAt ? new Date(a.publishedAt) : null;
						return (
							<li key={a.id}>
								<button
									className={cn(
										"flex w-full items-baseline gap-4 border-l-2 py-3 pl-3 text-left transition-colors",
										"hover:bg-muted/40 focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
										isUnread
											? "border-l-primary"
											: "border-l-transparent text-muted-foreground",
									)}
									data-testid="announcement-row"
									onClick={() => setOpenId(a.id)}
									type="button"
								>
									<span
										className={cn(
											"min-w-0 flex-1 truncate text-sm",
											isUnread && "text-foreground font-medium",
										)}
									>
										{a.renderedSubject}
									</span>
									{published ? (
										<span className="text-muted-foreground shrink-0 text-xs tabular-nums">
											{relativeDays(published, now) ?? formatDate(published)}
										</span>
									) : null}
								</button>
							</li>
						);
					})}
				</ul>
			</SectionCard>

			<AnnouncementDialog
				onClose={() => setOpenId(null)}
				recipientId={openId}
			/>
		</>
	);
}
