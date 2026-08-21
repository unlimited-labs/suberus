import { IconSend } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	adminSubmissionsQueryOptions,
	adminSubmitDraftFn,
	editorSubmissionQueryOptions,
} from "@/features/submissions/api/admin-submissions";
import { Button } from "@/shared/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/shared/ui/dialog";

interface SubmitDraftDialogProps {
	submissionId: string;
	submissionTitle: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmitted: () => void;
}

export function SubmitDraftDialog({
	submissionId,
	submissionTitle,
	open,
	onOpenChange,
	onSubmitted,
}: SubmitDraftDialogProps) {
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: () => adminSubmitDraftFn({ data: { submissionId } }),
		onSuccess: (result) => {
			if (!result.success) {
				toast.error(result.error ?? "Failed to submit the draft");
				return;
			}
			queryClient.invalidateQueries({
				queryKey: adminSubmissionsQueryOptions().queryKey,
			});
			queryClient.invalidateQueries({
				queryKey: editorSubmissionQueryOptions(submissionId).queryKey,
			});
			onOpenChange(false);
			onSubmitted();
			toast.success("Draft submitted");
		},
		onError: () => toast.error("Failed to submit the draft"),
	});

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<IconSend className="size-5" />
						Submit Draft
					</DialogTitle>
					<DialogDescription>
						Send this draft into review on the author's behalf:
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-3 py-2">
					<p className="font-medium">{submissionTitle}</p>
					<p className="text-muted-foreground text-sm">
						The presenting author receives the usual submission confirmation
						e-mail. This cannot be undone.
					</p>
				</div>
				<DialogFooter>
					<Button onClick={() => onOpenChange(false)} variant="outline">
						Cancel
					</Button>
					<Button
						disabled={mutation.isPending}
						onClick={() => mutation.mutate()}
					>
						{mutation.isPending ? "Submitting..." : "Submit Draft"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
