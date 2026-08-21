import { IconAlertTriangle, IconLoader2 } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
	myExhibitorQueryOptions,
	withdrawMyExhibitorFn,
} from "@/features/exhibitors/api/exhibitors";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/shared/ui/dialog";

interface WithdrawExhibitorDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	hasPresentation: boolean;
}

export function WithdrawExhibitorDialog({
	open,
	onOpenChange,
	hasPresentation,
}: WithdrawExhibitorDialogProps) {
	const queryClient = useQueryClient();
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleWithdraw = async () => {
		setIsSubmitting(true);
		try {
			await withdrawMyExhibitorFn();
			toast.success("Application withdrawn");
			onOpenChange(false);
			await queryClient.invalidateQueries({
				queryKey: myExhibitorQueryOptions().queryKey,
			});
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Withdraw failed");
		}
		setIsSubmitting(false);
	};

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Withdraw Application</DialogTitle>
					<DialogDescription>
						Withdraw your exhibitor application from the conference
					</DialogDescription>
				</DialogHeader>

				<Alert variant="destructive">
					<IconAlertTriangle className="size-4" />
					<AlertDescription>
						This will withdraw your exhibitor application.
						{hasPresentation &&
							" Your company presentation will also be withdrawn."}{" "}
						This action cannot be undone — contact the organizer if you change
						your mind.
					</AlertDescription>
				</Alert>

				<DialogFooter>
					<Button
						disabled={isSubmitting}
						onClick={() => onOpenChange(false)}
						variant="outline"
					>
						Cancel
					</Button>
					<Button
						data-testid="exhibitor-withdraw-confirm"
						disabled={isSubmitting}
						onClick={handleWithdraw}
						variant="destructive"
					>
						{isSubmitting && (
							<IconLoader2 className="mr-2 size-4 animate-spin" />
						)}
						Withdraw application
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
