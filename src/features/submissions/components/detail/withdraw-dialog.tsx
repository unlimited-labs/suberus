import { IconAlertTriangle, IconLoader2 } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
	mySubmissionsQueryOptions,
	submissionDetailQueryOptions,
} from "@/features/submissions/api/submissions";
import { withdrawSubmissionFn } from "@/features/workflow/api/workflow";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/shared/ui/dialog";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";

interface WithdrawDialogProps {
	submissionId: string;
	submissionTitle: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function WithdrawDialog({
	submissionId,
	submissionTitle,
	open,
	onOpenChange,
}: WithdrawDialogProps) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [reason, setReason] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleWithdraw = async () => {
		setIsSubmitting(true);
		try {
			const result = await withdrawSubmissionFn({
				data: {
					submissionId,
					reason: reason.trim() || undefined,
				},
			});

			if (result.success) {
				toast.success("Submission withdrawn");
				onOpenChange(false);
				setReason("");
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: submissionDetailQueryOptions(submissionId).queryKey,
					}),
					queryClient.invalidateQueries({
						queryKey: mySubmissionsQueryOptions().queryKey,
					}),
				]);
				navigate({ to: "/submissions/$id", params: { id: submissionId } });
			} else {
				toast.error(result.error ?? "Withdraw failed");
			}
		} catch {
			toast.error("Withdraw failed");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Withdraw Submission</DialogTitle>
					<DialogDescription className="truncate">
						{submissionTitle}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					<Alert variant="destructive">
						<IconAlertTriangle className="size-4" />
						<AlertDescription>
							This will withdraw your submission from the conference. All
							pending reviewer assignments will be cancelled. This action cannot
							be undone.
						</AlertDescription>
					</Alert>

					<div className="space-y-2">
						<Label htmlFor="withdraw-reason">Reason (optional)</Label>
						<Textarea
							id="withdraw-reason"
							value={reason}
							onChange={(e) => setReason(e.target.value)}
							placeholder="e.g., Submitting to a different venue, major revision needed..."
							rows={3}
						/>
						<p className="text-xs text-muted-foreground">
							This reason will be recorded in the activity log.
						</p>
					</div>
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={isSubmitting}
					>
						Cancel
					</Button>
					<Button
						variant="destructive"
						onClick={handleWithdraw}
						disabled={isSubmitting}
					>
						{isSubmitting && (
							<IconLoader2 className="mr-2 size-4 animate-spin" />
						)}
						Withdraw Submission
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
