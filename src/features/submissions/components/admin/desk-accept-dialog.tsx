import { IconInfoCircle, IconLoader2 } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";
import { deskAcceptFn } from "@/features/workflow/api/workflow";
import { getErrorMessage } from "@/shared/lib/error-message";
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

interface DeskAcceptDialogProps {
	submissionId: string;
	submissionTitle: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onAccepted?: () => void;
}

export function DeskAcceptDialog({
	submissionId,
	submissionTitle,
	open,
	onOpenChange,
	onAccepted,
}: DeskAcceptDialogProps) {
	const [reason, setReason] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSubmit = async () => {
		if (!reason.trim()) {
			toast.error("Please provide a reason for acceptance");
			return;
		}

		setIsSubmitting(true);
		try {
			const result = await deskAcceptFn({
				data: {
					submissionId,
					reason: reason.trim(),
				},
			});

			if (result.success) {
				toast.success("Submission desk accepted");
				onOpenChange(false);
				onAccepted?.();
				setReason("");
			} else {
				toast.error(result.error || "Failed to accept submission");
			}
		} catch (error) {
			toast.error(getErrorMessage(error, "Failed to accept submission"));
		}
		setIsSubmitting(false);
	};

	const handleOpenChange = (isOpen: boolean) => {
		if (!isOpen) setReason("");
		onOpenChange(isOpen);
	};

	return (
		<Dialog onOpenChange={handleOpenChange} open={open}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Desk Acceptance</DialogTitle>
					<DialogDescription className="truncate">
						{submissionTitle}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					<Alert>
						<IconInfoCircle className="size-4" />
						<AlertDescription>
							This action will accept the submission without peer review. This
							cannot be undone.
						</AlertDescription>
					</Alert>

					<div className="space-y-2">
						<Label htmlFor="reason">
							Reason for Acceptance <span className="text-destructive">*</span>
						</Label>
						<Textarea
							id="reason"
							onChange={(e) => setReason(e.target.value)}
							placeholder="e.g., Invited speaker, editorial decision..."
							required
							rows={4}
							value={reason}
						/>
						<p className="text-xs text-muted-foreground">
							This reason will be recorded in the audit trail and may be shared
							with the author.
						</p>
					</div>
				</div>

				<DialogFooter>
					<Button
						disabled={isSubmitting}
						onClick={() => handleOpenChange(false)}
						variant="outline"
					>
						Cancel
					</Button>
					<Button
						disabled={!reason.trim() || isSubmitting}
						onClick={handleSubmit}
					>
						{isSubmitting && (
							<IconLoader2 className="mr-2 size-4 animate-spin" />
						)}
						Accept Submission
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
