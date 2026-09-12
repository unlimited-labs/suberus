import { IconAlertTriangle } from "@tabler/icons-react";
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

interface DeleteConfirmDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description: ReactNode;
	confirmLabel: string;
	isChecking: boolean;
	blocked?: { title: string; description: string; content: ReactNode } | null;
	isPending: boolean;
	onConfirm: () => void;
	children: ReactNode;
}

export function DeleteConfirmDialog({
	open,
	onOpenChange,
	title,
	description,
	confirmLabel,
	isChecking,
	blocked,
	isPending,
	onConfirm,
	children,
}: DeleteConfirmDialogProps) {
	if (isChecking) {
		return (
			<Dialog onOpenChange={onOpenChange} open={open}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{title}</DialogTitle>
					</DialogHeader>
					<p className="text-muted-foreground py-4 text-sm">Checking...</p>
				</DialogContent>
			</Dialog>
		);
	}

	if (blocked) {
		return (
			<Dialog onOpenChange={onOpenChange} open={open}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{blocked.title}</DialogTitle>
						<DialogDescription>{blocked.description}</DialogDescription>
					</DialogHeader>
					{blocked.content}
					<DialogFooter>
						<Button onClick={() => onOpenChange(false)} variant="outline">
							Close
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		);
	}

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<IconAlertTriangle className="text-destructive size-5" />
						{title}
					</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>
				{children}
				<DialogFooter>
					<Button onClick={() => onOpenChange(false)} variant="outline">
						Cancel
					</Button>
					<Button
						disabled={isPending}
						onClick={onConfirm}
						variant="destructive"
					>
						{isPending ? "Deleting..." : confirmLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
