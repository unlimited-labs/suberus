import { ReasoningConfirmDialog } from "@/shared/components/reasoning-confirm-dialog";

interface OverrideDecisionDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onOverride: (reasoning: string, onSuccess?: () => void) => void;
	isTransitioning: boolean;
}

export function OverrideDecisionDialog({
	open,
	onOpenChange,
	onOverride,
	isTransitioning,
}: OverrideDecisionDialogProps) {
	return (
		<ReasoningConfirmDialog
			confirmLabel="Override"
			description="This will revert the submission to Awaiting Decision, allowing you to make a new decision."
			isPending={isTransitioning}
			onConfirm={onOverride}
			onOpenChange={onOpenChange}
			open={open}
			pendingLabel="Overriding..."
			placeholder="Why are you overriding this decision?"
			reasonId="override-reason"
			title="Override Decision"
		/>
	);
}
