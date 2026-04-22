import { IconAlertTriangle } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
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
import type { AdminUser } from "@/lib/server/admin/users";
import {
	adminUsersQueryOptions,
	checkAdminUserDeletable,
	deleteAdminUser,
} from "@/server-fns/admin/users";

interface UserDeleteDialogProps {
	user: AdminUser;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function UserDeleteDialog({
	user,
	open,
	onOpenChange,
}: UserDeleteDialogProps) {
	const queryClient = useQueryClient();
	const navigate = useNavigate();

	const { data: check, isLoading } = useQuery({
		queryKey: ["admin", "users", user.id, "deletable"],
		queryFn: () => checkAdminUserDeletable({ data: { id: user.id } }),
		enabled: open,
	});

	const mutation = useMutation({
		mutationFn: () => deleteAdminUser({ data: { id: user.id } }),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: adminUsersQueryOptions().queryKey,
			});
			onOpenChange(false);
			toast.success("User deleted");
			navigate({ to: "/admin/users" });
		},
		onError: (error) => {
			if (error instanceof Response) {
				error.text().then((msg) => toast.error(msg));
			} else {
				toast.error("Failed to delete user");
			}
		},
	});

	const displayName =
		[user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;

	if (isLoading) {
		return (
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete User Account</DialogTitle>
					</DialogHeader>
					<p className="py-4 text-sm text-muted-foreground">Checking...</p>
				</DialogContent>
			</Dialog>
		);
	}

	if (check && !check.deletable) {
		return (
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Cannot Delete User</DialogTitle>
						<DialogDescription>This user cannot be deleted:</DialogDescription>
					</DialogHeader>
					<ul className="list-disc space-y-1 pl-6 text-sm">
						{check.reasons.map((reason) => (
							<li key={reason}>{reason}</li>
						))}
					</ul>
					<p className="text-sm text-muted-foreground">Remove these first.</p>
					<DialogFooter>
						<Button variant="outline" onClick={() => onOpenChange(false)}>
							Close
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		);
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<IconAlertTriangle className="size-5 text-destructive" />
						Delete User Account
					</DialogTitle>
					<DialogDescription>Permanently delete account of:</DialogDescription>
				</DialogHeader>
				<div className="space-y-2 py-2">
					<p className="font-medium">
						{displayName}{" "}
						<span className="text-muted-foreground">({user.email})</span>
					</p>
					<p className="text-sm text-muted-foreground">
						This action cannot be undone. All account data will be removed.
					</p>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button
						variant="destructive"
						onClick={() => mutation.mutate()}
						disabled={mutation.isPending}
					>
						{mutation.isPending ? "Deleting..." : "Delete User"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
