import { IconAlertTriangle, IconLoader2 } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { deskRejectFn } from "@/utils/workflow.functions";

interface DeskRejectDialogProps {
	submissionId: string;
	submissionTitle: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onRejected?: () => void;
}

export function DeskRejectDialog({
	submissionId,
	submissionTitle,
	open,
	onOpenChange,
	onRejected,
}: DeskRejectDialogProps) {
	const [reason, setReason] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSubmit = async () => {
		if (!reason.trim()) {
			toast.error("Please provide a reason for rejection");
			return;
		}

		setIsSubmitting(true);
		try {
			const result = await deskRejectFn({
				data: {
					submissionId,
					reason: reason.trim(),
				},
			});

			if (result.success) {
				toast.success("Submission desk rejected");
				onOpenChange(false);
				onRejected?.();
				setReason("");
			} else {
				toast.error(result.error || "Failed to reject submission");
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : "Failed to reject submission";
			toast.error(message);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Desk Rejection</DialogTitle>
					<DialogDescription className="truncate">
						{submissionTitle}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					<Alert variant="destructive">
						<IconAlertTriangle className="size-4" />
						<AlertDescription>
							This action will reject the submission without peer review. This
							cannot be undone.
						</AlertDescription>
					</Alert>

					<div className="space-y-2">
						<Label htmlFor="reason">
							Reason for Rejection <span className="text-destructive">*</span>
						</Label>
						<Textarea
							id="reason"
							value={reason}
							onChange={(e) => setReason(e.target.value)}
							placeholder="e.g., Out of scope, incomplete submission, duplicate..."
							rows={4}
							required
						/>
						<p className="text-xs text-muted-foreground">
							This reason will be recorded in the audit trail and may be shared
							with the author.
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
						onClick={handleSubmit}
						disabled={!reason.trim() || isSubmitting}
					>
						{isSubmitting && (
							<IconLoader2 className="mr-2 size-4 animate-spin" />
						)}
						Reject Submission
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
