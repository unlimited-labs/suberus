import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
	adminSubmissionsQueryOptions,
	deleteSubmissionFn,
	editorSubmissionQueryOptions,
	submissionDeletableQueryOptions,
} from "@/features/submissions/api/admin-submissions";
import { DeleteConfirmDialog } from "@/shared/components/delete-confirm-dialog";
import { getErrorMessage } from "@/shared/lib/error-message";

interface SubmissionDeleteDialogProps {
	submissionId: string;
	submissionTitle: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function SubmissionDeleteDialog({
	submissionId,
	submissionTitle,
	open,
	onOpenChange,
}: SubmissionDeleteDialogProps) {
	const queryClient = useQueryClient();
	const navigate = useNavigate();

	const { data: check, isLoading } = useQuery({
		...submissionDeletableQueryOptions(submissionId),
		enabled: open,
	});

	const mutation = useMutation({
		mutationFn: () => deleteSubmissionFn({ data: { submissionId } }),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: adminSubmissionsQueryOptions().queryKey,
			});
			queryClient.removeQueries({
				queryKey: editorSubmissionQueryOptions(submissionId).queryKey,
			});
			onOpenChange(false);
			toast.success("Submission deleted");
			navigate({ to: "/admin/submissions" });
		},
		onError: (error) => {
			toast.error(getErrorMessage(error, "Failed to delete submission"));
		},
	});

	return (
		<DeleteConfirmDialog
			confirmLabel="Delete Submission"
			description="Permanently delete submission:"
			isChecking={isLoading}
			isPending={mutation.isPending}
			onConfirm={() => mutation.mutate()}
			onOpenChange={onOpenChange}
			open={open}
			title="Delete Submission"
		>
			<div className="space-y-3 py-2">
				<p className="font-medium">{submissionTitle}</p>
				{check && check.warnings.length > 0 && (
					<div className="border-destructive/50 bg-destructive/5 space-y-1 rounded-md border p-3">
						<p className="text-destructive text-sm font-medium">Warnings:</p>
						<ul className="text-destructive list-disc space-y-1 pl-5 text-sm">
							{check.warnings.map((warning) => (
								<li key={warning}>{warning}</li>
							))}
						</ul>
					</div>
				)}
				<p className="text-muted-foreground text-sm">
					This action cannot be undone. All submission data, including versions,
					reviews, and author links will be permanently removed.
				</p>
			</div>
		</DeleteConfirmDialog>
	);
}
