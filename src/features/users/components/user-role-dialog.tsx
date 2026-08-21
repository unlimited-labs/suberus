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
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Change User Role</DialogTitle>
					<DialogDescription>
						Select a new role for user {userName}.
					</DialogDescription>
				</DialogHeader>
				<div className="py-4">
					<Select
						items={roleOptions}
						onValueChange={(v) => {
							const found = roleOptions.find((opt) => opt.value === v);
							if (found) onRoleChange(found.value);
						}}
						value={selectedRole}
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
					<Button onClick={() => onOpenChange(false)} variant="outline">
						Cancel
					</Button>
					<Button disabled={isPending} onClick={onConfirm}>
						{isPending ? "Saving..." : "Save"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
