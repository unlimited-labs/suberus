import { IconAlertTriangle } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	adminSubmissionsQueryOptions,
	checkSubmissionDeletableFn,
	deleteSubmissionFn,
	editorSubmissionQueryOptions,
} from "@/features/submissions/api/admin-submissions";

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
		queryKey: ["submissions", "admin", submissionId, "deletable"],
		queryFn: () => checkSubmissionDeletableFn({ data: { submissionId } }),
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
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete Submission</DialogTitle>
					</DialogHeader>
					<p className="py-4 text-sm text-muted-foreground">Checking...</p>
				</DialogContent>
			</Dialog>
		);
	}

	const hasWarnings = check && check.warnings.length > 0;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<IconAlertTriangle className="size-5 text-destructive" />
						Delete Submission
					</DialogTitle>
					<DialogDescription>Permanently delete submission:</DialogDescription>
				</DialogHeader>
				<div className="space-y-3 py-2">
					<p className="font-medium">{submissionTitle}</p>
					{hasWarnings && (
						<div className="rounded-md border border-destructive/50 bg-destructive/5 p-3 space-y-1">
							<p className="text-sm font-medium text-destructive">Warnings:</p>
							<ul className="list-disc space-y-1 pl-5 text-sm text-destructive">
								{check.warnings.map((warning) => (
									<li key={warning}>{warning}</li>
								))}
							</ul>
						</div>
					)}
					<p className="text-sm text-muted-foreground">
						This action cannot be undone. All submission data, including
						versions, reviews, and author links will be permanently removed.
					</p>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button
						variant="destructive"
						onClick={() => mutation.mutate()}
						disabled={mutation.isPending}
					>
						{mutation.isPending ? "Deleting..." : "Delete Submission"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
