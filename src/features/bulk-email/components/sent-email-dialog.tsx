import { useQuery } from "@tanstack/react-query";
import { bulkEmailSentMessageQueryOptions } from "@/features/bulk-email/api/bulk-email";
import { useDateFormat } from "@/shared/hooks/use-date-format";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/shared/ui/dialog";
import { PreviewIframe } from "./preview-iframe";

interface SentEmailDialogProps {
	recipientId: string | null;
	onClose: () => void;
}

export function SentEmailDialog({
	recipientId,
	onClose,
}: SentEmailDialogProps) {
	const { formatDateTime } = useDateFormat();
	const { data, isPending } = useQuery({
		...bulkEmailSentMessageQueryOptions(recipientId ?? ""),
		enabled: recipientId !== null,
	});

	return (
		<Dialog
			onOpenChange={(open) => !open && onClose()}
			open={recipientId !== null}
		>
			<DialogContent className="sm:max-w-3xl" data-testid="sent-email-dialog">
				<DialogHeader>
					<DialogTitle className="truncate">
						{data ? data.subject : "Sent message"}
					</DialogTitle>
					<DialogDescription>
						{data
							? `To ${data.email}${data.sentAt ? ` · ${formatDateTime(data.sentAt)}` : ""}`
							: "Loading the archived copy of this message…"}
					</DialogDescription>
				</DialogHeader>
				{data ? (
					<PreviewIframe body={data.body} isHtml={data.isHtml} />
				) : (
					<p className="text-muted-foreground py-8 text-center text-sm">
						{isPending
							? "Loading…"
							: "No archived copy exists for this recipient."}
					</p>
				)}
			</DialogContent>
		</Dialog>
	);
}
