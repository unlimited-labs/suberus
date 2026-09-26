import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
	adminUserDeletableQueryOptions,
	adminUsersQueryOptions,
	deleteAdminUser,
} from "@/features/users/api/users";
import type { AdminUser } from "@/features/users/server/users";
import { DeleteConfirmDialog } from "@/shared/components/delete-confirm-dialog";
import { getErrorMessage } from "@/shared/lib/error-message";

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
		...adminUserDeletableQueryOptions(user.id),
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
			toast.error(getErrorMessage(error, "Failed to delete user"));
		},
	});

	const displayName =
		[user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;

	return (
		<DeleteConfirmDialog
			blocked={
				check && !check.deletable
					? {
							title: "Cannot Delete User",
							description: "This user cannot be deleted:",
							content: (
								<>
									<ul className="list-disc space-y-1 pl-6 text-sm">
										{check.reasons.map((reason) => (
											<li key={reason}>{reason}</li>
										))}
									</ul>
									<p className="text-muted-foreground text-sm">
										Remove these first.
									</p>
								</>
							),
						}
					: null
			}
			confirmLabel="Delete User"
			description="Permanently delete account of:"
			isChecking={isLoading}
			isPending={mutation.isPending}
			onConfirm={() => mutation.mutate()}
			onOpenChange={onOpenChange}
			open={open}
			title="Delete User Account"
		>
			<div className="space-y-2 py-2">
				<p className="font-medium">
					{displayName}{" "}
					<span className="text-muted-foreground">({user.email})</span>
				</p>
				<p className="text-muted-foreground text-sm">
					This action cannot be undone. All account data will be removed.
				</p>
			</div>
		</DeleteConfirmDialog>
	);
}
