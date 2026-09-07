import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import parse from "html-react-parser";
import { toast } from "sonner";
import {
	markMyAnnouncementRead,
	myAnnouncementQueryOptions,
	myAnnouncementsQueryOptions,
} from "@/features/announcements/api/announcements";
import { useDateFormat } from "@/shared/hooks/use-date-format";
import { getErrorMessage } from "@/shared/lib/error-message";
import { Button } from "@/shared/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/shared/ui/dialog";
import { Skeleton } from "@/shared/ui/skeleton";
import { PROSE_CLASS } from "./prose";

interface AnnouncementDialogProps {
	recipientId: string | null;
	onClose: () => void;
}

export function AnnouncementDialog({
	recipientId,
	onClose,
}: AnnouncementDialogProps) {
	const queryClient = useQueryClient();
	const { formatDateTime } = useDateFormat();
	const { data, isLoading } = useQuery({
		...myAnnouncementQueryOptions(recipientId ?? ""),
		enabled: recipientId !== null,
	});

	const markRead = useMutation({
		mutationFn: () =>
			markMyAnnouncementRead({ data: { recipientId: recipientId ?? "" } }),
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: myAnnouncementsQueryOptions().queryKey,
			});
			onClose();
		},
		onSettled: () => {
			void queryClient.invalidateQueries({
				queryKey: myAnnouncementQueryOptions(recipientId ?? "").queryKey,
			});
		},
		onError: (e) => toast.error(getErrorMessage(e, "Could not mark as read")),
	});

	return (
		<Dialog
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
			open={recipientId !== null}
		>
			<DialogContent className="sm:max-w-2xl" data-testid="announcement-dialog">
				<DialogHeader>
					<DialogTitle data-testid="announcement-dialog-subject">
						{data?.renderedSubject ?? "Announcement"}
					</DialogTitle>
					{data?.publishedAt ? (
						<DialogDescription>
							{formatDateTime(data.publishedAt)}
						</DialogDescription>
					) : null}
				</DialogHeader>

				<div
					className="max-h-[60vh] overflow-y-auto"
					data-testid="announcement-dialog-body"
				>
					{isLoading ? (
						<div className="space-y-2">
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-5/6" />
							<Skeleton className="h-4 w-2/3" />
						</div>
					) : (
						<div className={PROSE_CLASS}>{parse(data?.renderedBody ?? "")}</div>
					)}
				</div>

				<DialogFooter>
					{data?.readAt ? (
						<Button onClick={onClose} type="button" variant="outline">
							Close
						</Button>
					) : (
						<Button
							data-testid="mark-read-btn"
							disabled={markRead.isPending || !data}
							onClick={() => markRead.mutate()}
							type="button"
						>
							Mark as read
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
