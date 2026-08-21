import {
	IconAlertTriangle,
	IconInfoCircle,
	IconLoader2,
} from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";
import { decideExhibitorFn } from "@/features/exhibitors/api/exhibitors";
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
	const isReject = decision === "REJECTED";

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
					<DialogTitle>{text.title}</DialogTitle>
					<DialogDescription className="truncate">
						{companyName || "Exhibitor application"}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					<Alert variant={isReject ? "destructive" : "default"}>
						{isReject ? (
							<IconAlertTriangle className="size-4" />
						) : (
							<IconInfoCircle className="size-4" />
						)}
						<AlertDescription>{text.alert}</AlertDescription>
					</Alert>

					<div className="space-y-2">
						<Label htmlFor="decide-reason">
							{text.reasonLabel} <span className="text-destructive">*</span>
						</Label>
						<Textarea
							data-testid="decide-exhibitor-reason"
							id="decide-reason"
							onChange={(e) => setReason(e.target.value)}
							placeholder="Reason for the decision (included in the email to the exhibitor)"
							required
							rows={4}
							value={reason}
						/>
						<p className="text-muted-foreground text-xs">
							This reason will be recorded in the audit trail and included in
							the email to the exhibitor.
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
						data-testid="decide-exhibitor-confirm"
						disabled={reason.trim().length < 3 || isSubmitting}
						onClick={handleSubmit}
						variant={decision === "REJECTED" ? "destructive" : "default"}
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
