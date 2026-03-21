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
}

export function ConfirmConditionsDialog({
	open,
	onOpenChange,
	onConfirm,
	isTransitioning,
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
