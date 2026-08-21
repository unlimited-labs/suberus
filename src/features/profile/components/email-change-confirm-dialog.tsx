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
import { Input } from "@/shared/ui/input";

interface EmailChangeConfirmDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: (password: string) => void;
	isSubmitting?: boolean;
}

export function EmailChangeConfirmDialog({
	open,
	onOpenChange,
	onConfirm,
	isSubmitting,
}: EmailChangeConfirmDialogProps) {
	const [password, setPassword] = useState("");

	const close = () => {
		setPassword("");
		onOpenChange(false);
	};

	const confirm = () => {
		if (password) onConfirm(password);
	};

	return (
		<Dialog
			onOpenChange={(next) => (next ? onOpenChange(true) : close())}
			open={open}
		>
			<DialogContent data-testid="email-change-confirm-dialog">
				<DialogHeader>
					<DialogTitle>Confirm your password</DialogTitle>
					<DialogDescription>
						For your security, please re-enter your password to change your
						email address.
					</DialogDescription>
				</DialogHeader>
				<Input
					autoFocus
					data-testid="email-change-confirm-password"
					onChange={(e) => setPassword(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") confirm();
					}}
					placeholder="Password"
					type="password"
					value={password}
				/>
				<DialogFooter>
					<Button onClick={close} type="button" variant="outline">
						Cancel
					</Button>
					<Button
						data-testid="email-change-confirm-submit"
						disabled={!password || isSubmitting}
						onClick={confirm}
						type="button"
					>
						Confirm
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
