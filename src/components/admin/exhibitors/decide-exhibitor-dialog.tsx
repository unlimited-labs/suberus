import { IconInfoCircle, IconLoader2 } from "@tabler/icons-react";
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
import { getErrorMessage } from "@/lib/error-message";
import { decideExhibitorFn } from "@/server-fns/exhibitors";

const copy = {
	APPROVED: {
		title: "Approve Application",
		alert:
			"This will approve the application, accept the linked presentation (if any), and notify the exhibitor by email. This cannot be undone.",
		reasonLabel: "Reason for Approval",
		confirm: "Approve",
		success: "Exhibitor application approved",
		error: "Failed to approve application",
	},
	REJECTED: {
		title: "Reject Application",
		alert:
			"This will reject the application, reject the linked presentation (if any), and notify the exhibitor by email. This cannot be undone.",
		reasonLabel: "Reason for Rejection",
		confirm: "Reject",
		success: "Exhibitor application rejected",
		error: "Failed to reject application",
	},
} as const;

interface DecideExhibitorDialogProps {
	exhibitorId: string;
	companyName: string | null;
	decision: "APPROVED" | "REJECTED";
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onDecided?: () => void;
}

export function DecideExhibitorDialog({
	exhibitorId,
	companyName,
	decision,
	open,
	onOpenChange,
	onDecided,
}: DecideExhibitorDialogProps) {
	const [reason, setReason] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const text = copy[decision];

	const handleSubmit = async () => {
		if (reason.trim().length < 3) {
			toast.error("Please provide a reason (at least 3 characters)");
			return;
		}

		setIsSubmitting(true);
		try {
			await decideExhibitorFn({
				data: { id: exhibitorId, decision, reason: reason.trim() },
			});
			toast.success(text.success);
			onOpenChange(false);
			onDecided?.();
			setReason("");
		} catch (error) {
			toast.error(getErrorMessage(error, text.error));
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleOpenChange = (isOpen: boolean) => {
		if (!isOpen) setReason("");
		onOpenChange(isOpen);
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{text.title}</DialogTitle>
					<DialogDescription className="truncate">
						{companyName || "Exhibitor application"}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					<Alert>
						<IconInfoCircle className="size-4" />
						<AlertDescription>{text.alert}</AlertDescription>
					</Alert>

					<div className="space-y-2">
						<Label htmlFor="decide-reason">
							{text.reasonLabel} <span className="text-destructive">*</span>
						</Label>
						<Textarea
							id="decide-reason"
							data-testid="decide-exhibitor-reason"
							value={reason}
							onChange={(e) => setReason(e.target.value)}
							placeholder="Reason for the decision (included in the email to the exhibitor)"
							rows={4}
							required
						/>
						<p className="text-xs text-muted-foreground">
							This reason will be recorded in the audit trail and included in
							the email to the exhibitor.
						</p>
					</div>
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => handleOpenChange(false)}
						disabled={isSubmitting}
					>
						Cancel
					</Button>
					<Button
						data-testid="decide-exhibitor-confirm"
						variant={decision === "REJECTED" ? "destructive" : "default"}
						onClick={handleSubmit}
						disabled={reason.trim().length < 3 || isSubmitting}
					>
						{isSubmitting && (
							<IconLoader2 className="mr-2 size-4 animate-spin" />
						)}
						{text.confirm}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
