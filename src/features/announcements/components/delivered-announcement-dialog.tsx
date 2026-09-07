import { useQuery } from "@tanstack/react-query";
import parse from "html-react-parser";
import { announcementRecipientMessageQueryOptions } from "@/features/announcements/api/announcements";
import { useDateFormat } from "@/shared/hooks/use-date-format";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/shared/ui/dialog";
import { PROSE_CLASS } from "./prose";

interface DeliveredAnnouncementDialogProps {
	recipientId: string | null;
	onClose: () => void;
}

export function DeliveredAnnouncementDialog({
	recipientId,
	onClose,
}: DeliveredAnnouncementDialogProps) {
	const { formatDateTime } = useDateFormat();
	const { data, isPending } = useQuery({
		...announcementRecipientMessageQueryOptions(recipientId ?? ""),
		enabled: recipientId !== null,
	});

	return (
		<Dialog
			onOpenChange={(open) => !open && onClose()}
			open={recipientId !== null}
		>
			<DialogContent
				className="sm:max-w-2xl"
				data-testid="delivered-announcement-dialog"
			>
				<DialogHeader>
					<DialogTitle className="truncate">
						{data ? data.subject : "Delivered announcement"}
					</DialogTitle>
					<DialogDescription>
						{data
							? `To ${data.email}${data.publishedAt ? ` · ${formatDateTime(data.publishedAt)}` : ""} · ${data.readAt ? "read" : "unread"}`
							: "Loading what this person sees…"}
					</DialogDescription>
				</DialogHeader>
				{data ? (
					<div className="max-h-[60vh] overflow-y-auto">
						<div className={PROSE_CLASS}>{parse(data.body)}</div>
					</div>
				) : (
					<p className="text-muted-foreground py-8 text-center text-sm">
						{isPending ? "Loading…" : "This announcement is still a draft."}
					</p>
				)}
			</DialogContent>
		</Dialog>
	);
}
