import type { ComponentProps } from "react";
import { AssignReviewerDialog } from "@/features/submissions/components/admin/assign-reviewer-dialog";
import { ConfirmConditionsDialog } from "@/features/submissions/components/admin/confirm-conditions-dialog";
import { DeskAcceptDialog } from "@/features/submissions/components/admin/desk-accept-dialog";
import { DeskRejectDialog } from "@/features/submissions/components/admin/desk-reject-dialog";
import { EditorDecisionDialog } from "@/features/submissions/components/admin/editor-decision-dialog";
import { OverrideDecisionDialog } from "@/features/submissions/components/admin/override-decision-dialog";
import { SubmissionDeleteDialog } from "@/features/submissions/components/admin/submission-delete-dialog";
import type { EditorReview, EditorSubmission } from "./availability";

export type SubmissionDialogKind =
	| "assign"
	| "decision"
	| "deskAccept"
	| "deskReject"
	| "override"
	| "confirmConditions"
	| "delete";

interface DetailDialogsProps {
	activeDialog: SubmissionDialogKind | null;
	onClose: () => void;
	submission: Pick<EditorSubmission, "id" | "title" | "currentVersionNumber">;
	requiredReviewers: number;
	reviewDeadlineDays: number;
	currentRoundReviews: EditorReview[];
	revisionUploaded: boolean;
	isTransitioning: boolean;
	onInvalidate: () => void;
	onEditorOverride: ComponentProps<typeof OverrideDecisionDialog>["onOverride"];
	onConfirmConditionsMet: ComponentProps<
		typeof ConfirmConditionsDialog
	>["onConfirm"];
}

export function DetailDialogs({
	activeDialog,
	onClose,
	submission,
	requiredReviewers,
	reviewDeadlineDays,
	currentRoundReviews,
	revisionUploaded,
	isTransitioning,
	onInvalidate,
	onEditorOverride,
	onConfirmConditionsMet,
}: DetailDialogsProps) {
	const onOpenChange = (open: boolean) => {
		if (!open) onClose();
	};

	return (
		<>
			<AssignReviewerDialog
				submissionId={submission.id}
				submissionTitle={submission.title}
				requiredReviewers={requiredReviewers}
				reviewDeadlineDays={reviewDeadlineDays}
				open={activeDialog === "assign"}
				onOpenChange={onOpenChange}
				onAssigned={onInvalidate}
			/>

			<EditorDecisionDialog
				submissionId={submission.id}
				submissionTitle={submission.title}
				reviews={currentRoundReviews}
				open={activeDialog === "decision"}
				onOpenChange={onOpenChange}
				onDecisionMade={onInvalidate}
			/>

			<DeskAcceptDialog
				submissionId={submission.id}
				submissionTitle={submission.title}
				open={activeDialog === "deskAccept"}
				onOpenChange={onOpenChange}
				onAccepted={onInvalidate}
			/>

			<DeskRejectDialog
				submissionId={submission.id}
				submissionTitle={submission.title}
				open={activeDialog === "deskReject"}
				onOpenChange={onOpenChange}
				onRejected={onInvalidate}
			/>

			<OverrideDecisionDialog
				open={activeDialog === "override"}
				onOpenChange={onOpenChange}
				onOverride={onEditorOverride}
				isTransitioning={isTransitioning}
			/>

			<ConfirmConditionsDialog
				open={activeDialog === "confirmConditions"}
				onOpenChange={onOpenChange}
				onConfirm={onConfirmConditionsMet}
				isTransitioning={isTransitioning}
				revisionUploaded={revisionUploaded}
				latestVersion={submission.currentVersionNumber}
			/>

			<SubmissionDeleteDialog
				submissionId={submission.id}
				submissionTitle={submission.title}
				open={activeDialog === "delete"}
				onOpenChange={onOpenChange}
			/>
		</>
	);
}
