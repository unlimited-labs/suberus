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
			onOpenChange={(o) => {
				if (!busy) onOpenChange(o);
			}}
			open={open}
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button
						disabled={busy}
						onClick={() => onOpenChange(false)}
						variant="outline"
					>
						Cancel
					</Button>
					<Button disabled={busy} onClick={onConfirm} variant="destructive">
						{confirmLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
