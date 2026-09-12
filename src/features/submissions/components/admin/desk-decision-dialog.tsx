import { deskAcceptFn, deskRejectFn } from "@/features/workflow/api/workflow";
import {
	type DecisionCopy,
	ReasonDecisionDialog,
} from "@/shared/components/reason-decision-dialog";

export type DeskDecision = "accept" | "reject";

const COPY = {
	accept: {
		title: "Desk Acceptance",
		alert:
			"This action will accept the submission without peer review. This cannot be undone.",
		reasonLabel: "Reason for Acceptance",
		reasonPlaceholder: "e.g., Invited speaker, editorial decision...",
		reasonHelp:
			"This reason will be recorded in the audit trail and may be shared with the author.",
		confirm: "Accept Submission",
		success: "Submission desk accepted",
		error: "Failed to accept submission",
		emptyReason: "Please provide a reason for acceptance",
	},
	reject: {
		title: "Desk Rejection",
		alert:
			"This action will reject the submission without peer review. This cannot be undone.",
		reasonLabel: "Reason for Rejection",
		reasonPlaceholder:
			"e.g., Out of scope, incomplete submission, duplicate...",
		reasonHelp:
			"This reason will be recorded in the audit trail and may be shared with the author.",
		confirm: "Reject Submission",
		success: "Submission desk rejected",
		error: "Failed to reject submission",
		emptyReason: "Please provide a reason for rejection",
	},
} satisfies Record<string, DecisionCopy>;

interface DeskDecisionDialogProps {
	decision: DeskDecision;
	submissionId: string;
	submissionTitle: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onDecided?: () => void;
}

export function DeskDecisionDialog({
	decision,
	submissionId,
	submissionTitle,
	open,
	onOpenChange,
	onDecided,
}: DeskDecisionDialogProps) {
	const copy = COPY[decision];

	return (
		<ReasonDecisionDialog
			copy={copy}
			destructive={decision === "reject"}
			onConfirm={async (reason) => {
				const fn = decision === "accept" ? deskAcceptFn : deskRejectFn;
				const result = await fn({ data: { submissionId, reason } });
				// These server fns resolve with the failure instead of rejecting.
				if (!result.success) throw new Error(result.error || copy.error);
			}}
			onDecided={onDecided}
			onOpenChange={onOpenChange}
			open={open}
			subtitle={submissionTitle}
		/>
	);
}
