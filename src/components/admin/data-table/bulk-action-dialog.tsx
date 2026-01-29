import type { ReactNode } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

interface BulkActionDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description: string;
	onConfirm: () => void;
	isLoading: boolean;
	errors?: string[];
	confirmLabel?: string;
	loadingLabel?: string;
	confirmDisabled?: boolean;
	children: ReactNode;
}

export function BulkActionDialog({
	open,
	onOpenChange,
	title,
	description,
	onConfirm,
	isLoading,
	errors,
	confirmLabel = "Save",
	loadingLabel = "Saving...",
	confirmDisabled = false,
	children,
}: BulkActionDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>
				<div className="py-4 space-y-4">
					{children}
					{errors && errors.length > 0 && (
						<Alert variant="destructive">
							<AlertDescription>
								<ul className="list-disc pl-4 space-y-1">
									{errors.map((error, i) => (
										<li key={i}>{error}</li>
									))}
								</ul>
							</AlertDescription>
						</Alert>
					)}
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button onClick={onConfirm} disabled={isLoading || confirmDisabled}>
						{isLoading ? loadingLabel : confirmLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
