import { IconEye, IconPencil, IconSpeakerphone } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import parse from "html-react-parser";
import { useState } from "react";
import { userAnnouncementsQueryOptions } from "@/features/announcements/api/announcements";
import { useDateFormat } from "@/shared/hooks/use-date-format";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/shared/ui/dialog";
import { SectionCard } from "@/shared/ui/section-card";
import { PROSE_CLASS } from "./prose";
import { RecipientEditDialog } from "./recipient-edit-dialog";

interface UserAnnouncementsSectionProps {
	userId: string;
}

export function UserAnnouncementsSection({
	userId,
}: UserAnnouncementsSectionProps) {
	const { data } = useQuery(userAnnouncementsQueryOptions(userId));
	const { formatDateTime } = useDateFormat();
	const [editingId, setEditingId] = useState<string | null>(null);
	const [previewId, setPreviewId] = useState<string | null>(null);

	if (!data || data.length === 0) return null;

	const previewed = data.find((a) => a.id === previewId);

	return (
		<SectionCard icon={IconSpeakerphone} title="Announcements">
			<ul className="divide-y" data-testid="user-announcements">
				{data.map((a) => (
					<li
						className="flex items-center gap-3 py-2.5"
						data-testid="user-announcement-row"
						key={a.id}
					>
						<div className="min-w-0 flex-1">
							<p className="truncate text-sm font-medium">
								{a.renderedSubject}
							</p>
							<p className="text-muted-foreground text-xs">
								{a.publishedAt ? formatDateTime(a.publishedAt) : ""}
							</p>
						</div>
						{a.fromCampaign ? (
							<Badge variant="outline">Email copy</Badge>
						) : null}
						<Badge variant={a.readAt ? "default" : "secondary"}>
							{a.readAt ? "Read" : "Unread"}
						</Badge>
						<Button
							aria-label="Preview announcement"
							onClick={() => setPreviewId(a.id)}
							size="icon"
							variant="ghost"
						>
							<IconEye className="size-4" />
						</Button>
						{a.fromCampaign ? null : (
							<Button
								aria-label="Edit announcement"
								data-testid="edit-announcement-btn"
								onClick={() => setEditingId(a.id)}
								size="icon"
								variant="ghost"
							>
								<IconPencil className="size-4" />
							</Button>
						)}
					</li>
				))}
			</ul>

			<Dialog
				onOpenChange={(open) => {
					if (!open) setPreviewId(null);
				}}
				open={previewId !== null}
			>
				<DialogContent className="sm:max-w-2xl">
					<DialogHeader>
						<DialogTitle>{previewed?.renderedSubject ?? ""}</DialogTitle>
					</DialogHeader>
					<div className="max-h-[60vh] overflow-y-auto">
						<div className={PROSE_CLASS}>
							{parse(previewed?.renderedBody ?? "")}
						</div>
					</div>
				</DialogContent>
			</Dialog>

			<RecipientEditDialog
				onClose={() => setEditingId(null)}
				recipientId={editingId}
				userId={userId}
			/>
		</SectionCard>
	);
}
