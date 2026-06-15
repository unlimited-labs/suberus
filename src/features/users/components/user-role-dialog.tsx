import type { AssignableUserRole } from "@/features/users/labels";
import { Button } from "@/shared/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/shared/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/ui/select";

interface UserRoleDialogProps {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	userName: string;
	selectedRole: AssignableUserRole;
	onRoleChange: (role: AssignableUserRole) => void;
	onConfirm: () => void;
	isPending: boolean;
	roleOptions: { value: AssignableUserRole; label: string }[];
}

export function UserRoleDialog({
	open,
	onOpenChange,
	userName,
	selectedRole,
	onRoleChange,
	onConfirm,
	isPending,
	roleOptions,
}: UserRoleDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Change User Role</DialogTitle>
					<DialogDescription>
						Select a new role for user {userName}.
					</DialogDescription>
				</DialogHeader>
				<div className="py-4">
					<Select
						value={selectedRole}
						onValueChange={(v) => {
							const found = roleOptions.find((opt) => opt.value === v);
							if (found) onRoleChange(found.value);
						}}
					>
						<SelectTrigger>
							<SelectValue placeholder="Select role" />
						</SelectTrigger>
						<SelectContent>
							{roleOptions.map((role) => (
								<SelectItem key={role.value} value={role.value}>
									{role.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button onClick={onConfirm} disabled={isPending}>
						{isPending ? "Saving..." : "Save"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
