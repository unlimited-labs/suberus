import { type ReactNode, useState } from "react";
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

interface ReasoningConfirmDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description: ReactNode;
	/** Stable, not useId: E2E locates these fields by id. */
	reasonId: string;
	placeholder: string;
	confirmLabel: string;
	pendingLabel: string;
	isPending: boolean;
	onConfirm: (reasoning: string, onSuccess: () => void) => void;
	children?: ReactNode;
}

export function ReasoningConfirmDialog({
	open,
	onOpenChange,
	title,
	description,
	reasonId,
	placeholder,
	confirmLabel,
	pendingLabel,
	isPending,
	onConfirm,
	children,
}: ReasoningConfirmDialogProps) {
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
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>
				{children}
				<div className="space-y-2 py-4">
					<label className="text-sm font-medium" htmlFor={reasonId}>
						Reasoning *
					</label>
					<Textarea
						id={reasonId}
						onChange={(e) => setReasoning(e.target.value)}
						placeholder={placeholder}
						rows={3}
						value={reasoning}
					/>
				</div>
				<DialogFooter>
					<Button onClick={() => onOpenChange(false)} variant="outline">
						Cancel
					</Button>
					<Button
						disabled={isPending || !reasoning.trim()}
						onClick={handleConfirm}
					>
						{isPending ? pendingLabel : confirmLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
