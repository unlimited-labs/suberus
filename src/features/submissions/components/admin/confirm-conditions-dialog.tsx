import { IconAlertTriangle, IconFileCheck } from "@tabler/icons-react";
import { ReasoningConfirmDialog } from "@/shared/components/reasoning-confirm-dialog";

interface ConfirmConditionsDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: (reasoning: string, onSuccess?: () => void) => void;
	isTransitioning: boolean;
	revisionUploaded: boolean;
	latestVersion: number;
}

export function ConfirmConditionsDialog({
	open,
	onOpenChange,
	onConfirm,
	isTransitioning,
	revisionUploaded,
	latestVersion,
}: ConfirmConditionsDialogProps) {
	return (
		<ReasoningConfirmDialog
			confirmLabel="Confirm Accepted"
			description="This will promote the submission from Conditionally Accepted to Accepted."
			isPending={isTransitioning}
			onConfirm={onConfirm}
			onOpenChange={onOpenChange}
			open={open}
			pendingLabel="Confirming..."
			placeholder="Describe how conditions were met..."
			reasonId="confirm-conditions-reason"
			title="Confirm Conditions Met"
		>
			{revisionUploaded ? (
				<div className="flex items-start gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-700 dark:text-emerald-400">
					<IconFileCheck className="mt-0.5 size-4 shrink-0" />
					<p className="text-sm">
						The author uploaded a revised version (v{latestVersion}). Review it
						on the Content tab before confirming.
					</p>
				</div>
			) : (
				<div className="flex items-start gap-2 rounded-md border border-amber-500/20 bg-amber-500/10 p-3 text-amber-700 dark:text-amber-400">
					<IconAlertTriangle className="mt-0.5 size-4 shrink-0" />
					<p className="text-sm">
						The author has not uploaded a revised version since the decision.
						Confirm only if the conditions were met another way.
					</p>
				</div>
			)}
		</ReasoningConfirmDialog>
	);
}
