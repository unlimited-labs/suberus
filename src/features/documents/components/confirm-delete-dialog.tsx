import type { ReactNode } from "react";
import { Button } from "@/shared/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/shared/ui/dialog";

interface ConfirmDeleteDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: ReactNode;
	description: ReactNode;
	confirmLabel?: string;
	busy?: boolean;
	onConfirm: () => void;
}

/** Shared destructive confirmation used by the document/template deletes. */
export function ConfirmDeleteDialog({
	open,
	onOpenChange,
	title,
	description,
	confirmLabel = "Delete",
	busy = false,
	onConfirm,
}: ConfirmDeleteDialogProps) {
	return (
		<Dialog
			open={open}
			onOpenChange={(o) => {
				if (!busy) onOpenChange(o);
			}}
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={busy}
					>
						Cancel
					</Button>
					<Button variant="destructive" onClick={onConfirm} disabled={busy}>
						{confirmLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
