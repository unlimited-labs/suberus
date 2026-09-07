import { IconMail } from "@tabler/icons-react";
import { useState } from "react";
import type { getAnnouncementById } from "@/features/announcements/api/announcements";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { DeliveredAnnouncementDialog } from "./delivered-announcement-dialog";

type Announcement = Awaited<ReturnType<typeof getAnnouncementById>>;
type RecipientRow = Announcement["recipients"][number];

interface RecipientSummaryProps {
	/** Capped preview list (see RECIPIENT_PREVIEW_LIMIT), not necessarily all. */
	recipients: RecipientRow[];
	totalRecipients: number;
	readCount: number;
}

function initials(r: RecipientRow): string {
	const fromName = `${r.firstName?.[0] ?? ""}${r.lastName?.[0] ?? ""}`;
	return (fromName || r.email[0] || "?").toUpperCase();
}

function displayName(r: RecipientRow): string {
	return [r.firstName, r.lastName].filter(Boolean).join(" ") || r.email;
}

export function RecipientSummary({
	recipients,
	totalRecipients,
	readCount,
}: RecipientSummaryProps) {
	const hiddenCount = totalRecipients - recipients.length;
	const [previewId, setPreviewId] = useState<string | null>(null);

	return (
		<div className="space-y-3 text-sm" data-testid="recipient-summary">
			<p>
				<span
					className="font-medium tabular-nums"
					data-testid="recipient-count"
				>
					{totalRecipients}
				</span>{" "}
				<span className="text-muted-foreground">
					{totalRecipients === 1 ? "recipient" : "recipients"}
					{readCount > 0 ? ` · ${readCount} read` : ""}
				</span>
			</p>

			<ul className="-mx-1 max-h-64 space-y-0.5 overflow-auto px-1">
				{recipients.map((r) => (
					<li className="flex items-center gap-2.5 rounded-md py-1" key={r.id}>
						<Avatar size="sm">
							<AvatarFallback className="text-[10px] font-medium">
								{initials(r)}
							</AvatarFallback>
						</Avatar>
						<div className="min-w-0 flex-1 leading-tight">
							<p className="truncate text-sm">{displayName(r)}</p>
							<p className="text-muted-foreground truncate text-xs">
								{r.email}
							</p>
						</div>
						{r.hasArchive ? (
							<Badge
								asChild
								className="shrink-0 text-[10px]"
								variant={r.readAt ? "default" : "secondary"}
							>
								<button
									aria-label={`Preview what ${r.email} sees`}
									data-testid="recipient-preview-trigger"
									onClick={() => setPreviewId(r.id)}
									type="button"
								>
									<span className="group-hover/badge:hidden">
										{r.readAt ? "READ" : "UNREAD"}
									</span>
									<IconMail className="hidden group-hover/badge:block" />
								</button>
							</Badge>
						) : null}
					</li>
				))}
				{hiddenCount > 0 ? (
					<li className="text-muted-foreground px-1 pt-1.5 text-xs">
						+ {hiddenCount} more not shown
					</li>
				) : null}
			</ul>

			<DeliveredAnnouncementDialog
				onClose={() => setPreviewId(null)}
				recipientId={previewId}
			/>
		</div>
	);
}
