import { IconAlertTriangle, IconFileCheck } from "@tabler/icons-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

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
		<Dialog open={open} onOpenChange={onOpenChange}>
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
						htmlFor="confirm-conditions-reason"
						className="text-sm font-medium"
					>
						Reasoning *
					</label>
					<Textarea
						id="confirm-conditions-reason"
						placeholder="Describe how conditions were met..."
						value={reasoning}
						onChange={(e) => setReasoning(e.target.value)}
						rows={3}
					/>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button
						onClick={handleConfirm}
						disabled={isTransitioning || !reasoning.trim()}
					>
						{isTransitioning ? "Confirming..." : "Confirm Accepted"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
