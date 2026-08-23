import { IconAlertTriangle } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
	adminSubmissionsQueryOptions,
	submissionDeletableQueryOptions,
	deleteSubmissionFn,
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
			if (error instanceof Response) {
				error.text().then((msg) => toast.error(msg));
			} else {
				toast.error("Failed to delete submission");
			}
		},
	});

	if (isLoading) {
		return (
			<Dialog onOpenChange={onOpenChange} open={open}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete Submission</DialogTitle>
					</DialogHeader>
					<p className="text-muted-foreground py-4 text-sm">Checking...</p>
				</DialogContent>
			</Dialog>
		);
	}

	const hasWarnings = check && check.warnings.length > 0;

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<IconAlertTriangle className="text-destructive size-5" />
						Delete Submission
					</DialogTitle>
					<DialogDescription>Permanently delete submission:</DialogDescription>
				</DialogHeader>
				<div className="space-y-3 py-2">
					<p className="font-medium">{submissionTitle}</p>
					{hasWarnings && (
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
						This action cannot be undone. All submission data, including
						versions, reviews, and author links will be permanently removed.
					</p>
				</div>
				<DialogFooter>
					<Button onClick={() => onOpenChange(false)} variant="outline">
						Cancel
					</Button>
					<Button
						disabled={mutation.isPending}
						onClick={() => mutation.mutate()}
						variant="destructive"
					>
						{mutation.isPending ? "Deleting..." : "Delete Submission"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
