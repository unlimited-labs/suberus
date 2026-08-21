import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useSession } from "@/shared/hooks/use-session";
import { authClient } from "@/shared/lib/auth-client";
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

interface PasskeyReauthDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onReauthenticated: () => void;
}

export function PasskeyReauthDialog({
	open,
	onOpenChange,
	onReauthenticated,
}: PasskeyReauthDialogProps) {
	const { user, refetch: refetchSession } = useSession();
	const [password, setPassword] = useState("");

	const reauthMutation = useMutation({
		mutationFn: async () => {
			if (!user) throw new Error("Not signed in");
			const res = await authClient.signIn.email({
				email: user.email,
				password,
			});
			if (res.error) {
				throw new Error(res.error.message ?? "Incorrect password");
			}
		},
		onSuccess: async () => {
			setPassword("");
			await refetchSession();
			onReauthenticated();
		},
		onError: (e: Error) => toast.error(e.message),
	});

	const close = () => {
		setPassword("");
		onOpenChange(false);
	};

	return (
		<Dialog
			onOpenChange={(next) => (next ? onOpenChange(true) : close())}
			open={open}
		>
			<DialogContent data-testid="passkey-reauth-dialog">
				<DialogHeader>
					<DialogTitle>Confirm your password</DialogTitle>
					<DialogDescription>
						For your security, please re-enter your password to add a passkey.
					</DialogDescription>
				</DialogHeader>
				<Input
					autoFocus
					data-testid="passkey-reauth-password"
					onChange={(e) => setPassword(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter" && password) {
							reauthMutation.mutate();
						}
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
						data-testid="passkey-reauth-confirm"
						disabled={!password || reauthMutation.isPending}
						onClick={() => reauthMutation.mutate()}
						type="button"
					>
						Confirm
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
