import { IconAlertTriangle, IconFileCheck } from "@tabler/icons-react";
import { useState } from "react";
import { Button } from "@/shared/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/shared/ui/dialog";
import { Textarea } from "@/shared/ui/textarea";

interface ConfirmConditionsDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: (reasoning: string, onSuccess?: () => void) => void;
	isTransitioning: boolean;
	/** Whether the author uploaded a revised version since the conditional decision */
	revisionUploaded: boolean;
	/** Latest version number (shown when a revision was uploaded) */
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
	const [reasoning, setReasoning] = useState("");

	const handleConfirm = () => {
		if (!reasoning.trim()) return;
		onConfirm(reasoning.trim(), () => {
			onOpenChange(false);
			setReasoning("");
		});
	};

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Confirm Conditions Met</DialogTitle>
					<DialogDescription>
						This will promote the submission from Conditionally Accepted to
						Accepted.
					</DialogDescription>
				</DialogHeader>
				{revisionUploaded ? (
					<div className="flex items-start gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-700 dark:text-emerald-400">
						<IconFileCheck className="mt-0.5 size-4 shrink-0" />
						<p className="text-sm">
							The author uploaded a revised version (v{latestVersion}). Review
							it on the Content tab before confirming.
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
				<div className="space-y-2 py-4">
					<label
						className="text-sm font-medium"
						htmlFor="confirm-conditions-reason"
					>
						Reasoning *
					</label>
					<Textarea
						id="confirm-conditions-reason"
						onChange={(e) => setReasoning(e.target.value)}
						placeholder="Describe how conditions were met..."
						rows={3}
						value={reasoning}
					/>
				</div>
				<DialogFooter>
					<Button onClick={() => onOpenChange(false)} variant="outline">
						Cancel
					</Button>
					<Button
						disabled={isTransitioning || !reasoning.trim()}
						onClick={handleConfirm}
					>
						{isTransitioning ? "Confirming..." : "Confirm Accepted"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
