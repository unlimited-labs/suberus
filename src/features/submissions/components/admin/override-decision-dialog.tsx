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
	const [reasoning, setReasoning] = useState("");

	const handleOverride = () => {
		if (!reasoning.trim()) return;
		onOverride(reasoning.trim(), () => {
			onOpenChange(false);
			setReasoning("");
		});
	};

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Override Decision</DialogTitle>
					<DialogDescription>
						This will revert the submission to Awaiting Decision, allowing you
						to make a new decision.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-2 py-4">
					<label className="text-sm font-medium" htmlFor="override-reason">
						Reasoning *
					</label>
					<Textarea
						id="override-reason"
						onChange={(e) => setReasoning(e.target.value)}
						placeholder="Why are you overriding this decision?"
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
						onClick={handleOverride}
					>
						{isTransitioning ? "Overriding..." : "Override"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
