import { decideExhibitorFn } from "@/features/exhibitors/api/exhibitors";
import {
	type DecisionCopy,
	ReasonDecisionDialog,
} from "@/shared/components/reason-decision-dialog";

const REASON_HELP =
	"This reason will be recorded in the audit trail and included in the email to the exhibitor.";
const REASON_PLACEHOLDER =
	"Reason for the decision (included in the email to the exhibitor)";
const MIN_REASON_LENGTH = 3;

const COPY = {
	APPROVED: {
		title: "Approve Application",
		alert:
			"This will approve the application, accept the linked presentation (if any), and notify the exhibitor by email. This cannot be undone.",
		reasonLabel: "Reason for Approval",
		reasonPlaceholder: REASON_PLACEHOLDER,
		reasonHelp: REASON_HELP,
		confirm: "Approve",
		success: "Exhibitor application approved",
		error: "Failed to approve application",
		emptyReason: "Please provide a reason (at least 3 characters)",
	},
	REJECTED: {
		title: "Reject Application",
		alert:
			"This will reject the application, reject the linked presentation (if any), and notify the exhibitor by email. This cannot be undone.",
		reasonLabel: "Reason for Rejection",
		reasonPlaceholder: REASON_PLACEHOLDER,
		reasonHelp: REASON_HELP,
		confirm: "Reject",
		success: "Exhibitor application rejected",
		error: "Failed to reject application",
		emptyReason: "Please provide a reason (at least 3 characters)",
	},
} satisfies Record<string, DecisionCopy>;

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
	return (
		<ReasonDecisionDialog
			copy={COPY[decision]}
			destructive={decision === "REJECTED"}
			minReasonLength={MIN_REASON_LENGTH}
			onConfirm={async (reason) => {
				await decideExhibitorFn({
					data: { id: exhibitorId, decision, reason },
				});
			}}
			onDecided={onDecided}
			onOpenChange={onOpenChange}
			open={open}
			subtitle={companyName || "Exhibitor application"}
			testIdPrefix="decide-exhibitor"
		/>
	);
}
