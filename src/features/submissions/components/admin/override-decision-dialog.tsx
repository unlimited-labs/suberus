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
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Override Decision</DialogTitle>
					<DialogDescription>
						This will revert the submission to Awaiting Decision, allowing you
						to make a new decision.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-2 py-4">
					<label htmlFor="override-reason" className="text-sm font-medium">
						Reasoning *
					</label>
					<Textarea
						id="override-reason"
						placeholder="Why are you overriding this decision?"
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
						onClick={handleOverride}
						disabled={isTransitioning || !reasoning.trim()}
					>
						{isTransitioning ? "Overriding..." : "Override"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
