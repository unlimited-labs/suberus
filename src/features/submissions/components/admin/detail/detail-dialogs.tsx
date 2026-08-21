import type { ComponentProps } from "react";
import { AssignReviewerDialog } from "@/features/submissions/components/admin/assign-reviewer-dialog";
import { ConfirmConditionsDialog } from "@/features/submissions/components/admin/confirm-conditions-dialog";
import { DeskAcceptDialog } from "@/features/submissions/components/admin/desk-accept-dialog";
import { DeskRejectDialog } from "@/features/submissions/components/admin/desk-reject-dialog";
import { EditorDecisionDialog } from "@/features/submissions/components/admin/editor-decision-dialog";
import { OverrideDecisionDialog } from "@/features/submissions/components/admin/override-decision-dialog";
import { SubmissionDeleteDialog } from "@/features/submissions/components/admin/submission-delete-dialog";
import { SubmitDraftDialog } from "@/features/submissions/components/admin/submit-draft-dialog";
import type { EditorReview, EditorSubmission } from "./availability";

export type SubmissionDialogKind =
	| "assign"
	| "submitDraft"
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
				onAssigned={onInvalidate}
				onOpenChange={onOpenChange}
				open={activeDialog === "assign"}
				requiredReviewers={requiredReviewers}
				reviewDeadlineDays={reviewDeadlineDays}
				submissionId={submission.id}
				submissionTitle={submission.title}
			/>

			<EditorDecisionDialog
				onDecisionMade={onInvalidate}
				onOpenChange={onOpenChange}
				open={activeDialog === "decision"}
				reviews={currentRoundReviews}
				submissionId={submission.id}
				submissionTitle={submission.title}
			/>

			<DeskAcceptDialog
				onAccepted={onInvalidate}
				onOpenChange={onOpenChange}
				open={activeDialog === "deskAccept"}
				submissionId={submission.id}
				submissionTitle={submission.title}
			/>

			<DeskRejectDialog
				onOpenChange={onOpenChange}
				onRejected={onInvalidate}
				open={activeDialog === "deskReject"}
				submissionId={submission.id}
				submissionTitle={submission.title}
			/>

			<OverrideDecisionDialog
				isTransitioning={isTransitioning}
				onOpenChange={onOpenChange}
				onOverride={onEditorOverride}
				open={activeDialog === "override"}
			/>

			<ConfirmConditionsDialog
				isTransitioning={isTransitioning}
				latestVersion={submission.currentVersionNumber}
				onConfirm={onConfirmConditionsMet}
				onOpenChange={onOpenChange}
				open={activeDialog === "confirmConditions"}
				revisionUploaded={revisionUploaded}
			/>

			<SubmitDraftDialog
				onOpenChange={onOpenChange}
				onSubmitted={onInvalidate}
				open={activeDialog === "submitDraft"}
				submissionId={submission.id}
				submissionTitle={submission.title}
			/>

			<SubmissionDeleteDialog
				onOpenChange={onOpenChange}
				open={activeDialog === "delete"}
				submissionId={submission.id}
				submissionTitle={submission.title}
			/>
		</>
	);
}
