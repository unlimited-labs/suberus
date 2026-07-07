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
			open={open}
			onOpenChange={(next) => (next ? onOpenChange(true) : close())}
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
					type="password"
					autoFocus
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") confirm();
					}}
					placeholder="Password"
					data-testid="email-change-confirm-password"
				/>
				<DialogFooter>
					<Button type="button" variant="outline" onClick={close}>
						Cancel
					</Button>
					<Button
						type="button"
						data-testid="email-change-confirm-submit"
						disabled={!password || isSubmitting}
						onClick={confirm}
					>
						Confirm
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
