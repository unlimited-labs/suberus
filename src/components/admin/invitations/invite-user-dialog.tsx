import { IconLoader2 } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { createInvitationFn } from "@/utils/admin-invitations.functions";

interface InviteUserDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess: () => void;
}

export function InviteUserDialog({
	open,
	onOpenChange,
	onSuccess,
}: InviteUserDialogProps) {
	const [email, setEmail] = useState("");
	const [role, setRole] = useState<"EDITOR" | "REVIEWER" | "ADMIN">("REVIEWER");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!email.trim()) {
			toast.error("Email is required");
			return;
		}

		setIsSubmitting(true);
		try {
			await createInvitationFn({ data: { email: email.trim(), role } });
			toast.success("Invitation sent");
			setEmail("");
			setRole("REVIEWER");
			onOpenChange(false);
			onSuccess();
		} catch (error) {
			toast.error(
				error instanceof Response
					? "User with this email already exists"
					: error instanceof Error
						? error.message
						: "Failed to send invitation",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Invite User</DialogTitle>
					<DialogDescription>
						Send an invitation email with a registration link.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="invite-email">Email</Label>
						<Input
							id="invite-email"
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="user@example.com"
							required
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="invite-role">Role</Label>
						<Select
							value={role}
							onValueChange={(v) =>
								setRole(v as "EDITOR" | "REVIEWER" | "ADMIN")
							}
						>
							<SelectTrigger id="invite-role">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="REVIEWER">Reviewer</SelectItem>
								<SelectItem value="EDITOR">Editor</SelectItem>
								<SelectItem value="ADMIN">Administrator</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<DialogFooter>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting && (
								<IconLoader2 className="mr-2 size-4 animate-spin" />
							)}
							Send Invitation
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
