import {
	IconAlertTriangle,
	IconInfoCircle,
	IconLoader2,
} from "@tabler/icons-react";
import { type ReactNode, useId, useState } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/shared/lib/error-message";
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
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";

export interface DecisionCopy {
	title: string;
	alert: string;
	reasonLabel: string;
	reasonPlaceholder: string;
	reasonHelp: string;
	confirm: string;
	success: string;
	error: string;
	emptyReason: string;
}

interface ReasonDecisionDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	subtitle: ReactNode;
	copy: DecisionCopy;
	destructive?: boolean;
	minReasonLength?: number;
	testIdPrefix?: string;
	/** Must reject on failure — envelope-returning server fns throw at the call site. */
	onConfirm: (reason: string) => Promise<void>;
	onDecided?: () => void;
}

export function ReasonDecisionDialog({
	open,
	onOpenChange,
	subtitle,
	copy,
	destructive = false,
	minReasonLength = 1,
	testIdPrefix,
	onConfirm,
	onDecided,
}: ReasonDecisionDialogProps) {
	const reasonId = useId();
	const [reason, setReason] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const tooShort = reason.trim().length < minReasonLength;

	const handleOpenChange = (isOpen: boolean) => {
		if (!isOpen) setReason("");
		onOpenChange(isOpen);
	};

	const handleSubmit = async () => {
		if (tooShort) {
			toast.error(copy.emptyReason);
			return;
		}
		setIsSubmitting(true);
		try {
			await onConfirm(reason.trim());
			toast.success(copy.success);
			onOpenChange(false);
			onDecided?.();
			setReason("");
		} catch (error) {
			toast.error(getErrorMessage(error, copy.error));
		}
		setIsSubmitting(false);
	};

	return (
		<Dialog onOpenChange={handleOpenChange} open={open}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{copy.title}</DialogTitle>
					<DialogDescription className="truncate">{subtitle}</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					<Alert variant={destructive ? "destructive" : "default"}>
						{destructive ? (
							<IconAlertTriangle className="size-4" />
						) : (
							<IconInfoCircle className="size-4" />
						)}
						<AlertDescription>{copy.alert}</AlertDescription>
					</Alert>

					<div className="space-y-2">
						<Label htmlFor={reasonId}>
							{copy.reasonLabel} <span className="text-destructive">*</span>
						</Label>
						<Textarea
							data-testid={testIdPrefix && `${testIdPrefix}-reason`}
							id={reasonId}
							onChange={(e) => setReason(e.target.value)}
							placeholder={copy.reasonPlaceholder}
							required
							rows={4}
							value={reason}
						/>
						<p className="text-muted-foreground text-xs">{copy.reasonHelp}</p>
					</div>
				</div>

				<DialogFooter>
					<Button
						disabled={isSubmitting}
						onClick={() => handleOpenChange(false)}
						variant="outline"
					>
						Cancel
					</Button>
					<Button
						data-testid={testIdPrefix && `${testIdPrefix}-confirm`}
						disabled={tooShort || isSubmitting}
						onClick={handleSubmit}
						variant={destructive ? "destructive" : "default"}
					>
						{isSubmitting && (
							<IconLoader2 className="mr-2 size-4 animate-spin" />
						)}
						{copy.confirm}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
