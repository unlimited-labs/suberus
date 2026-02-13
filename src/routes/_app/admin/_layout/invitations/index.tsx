import { IconMailPlus } from "@tabler/icons-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { DataTable, DataTableToolbar } from "@/components/admin/data-table";
import { createInvitationColumns } from "@/components/admin/invitations/columns";
import { InvitationMobileCard } from "@/components/admin/invitations/invitation-mobile-card";
import { InviteUserDialog } from "@/components/admin/invitations/invite-user-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import type { AdminInvitation } from "@/lib/server/admin/invitations";
import {
	cancelInvitationFn,
	getAdminInvitationsFn,
	resendInvitationFn,
} from "@/utils/admin-invitations.functions";

export const Route = createFileRoute("/_app/admin/_layout/invitations/")({
	component: InvitationsPage,
});

async function fetchInvitations(): Promise<AdminInvitation[]> {
	return getAdminInvitationsFn();
}

function InvitationsPage() {
	const queryClient = useQueryClient();
	const [dialogOpen, setDialogOpen] = useState(false);

	const {
		data: invitations = [],
		isLoading,
		error,
	} = useQuery({
		queryKey: ["admin-invitations"],
		queryFn: fetchInvitations,
	});

	const invalidate = useCallback(
		() => queryClient.invalidateQueries({ queryKey: ["admin-invitations"] }),
		[queryClient],
	);

	const handleResend = useCallback(
		async (id: string) => {
			try {
				await resendInvitationFn({ data: { id } });
				toast.success("Invitation resent");
				invalidate();
			} catch {
				toast.error("Failed to resend invitation");
			}
		},
		[invalidate],
	);

	const handleCancel = useCallback(
		async (id: string) => {
			try {
				await cancelInvitationFn({ data: { id } });
				toast.success("Invitation cancelled");
				invalidate();
			} catch {
				toast.error("Failed to cancel invitation");
			}
		},
		[invalidate],
	);

	const columns = useMemo(
		() =>
			createInvitationColumns({
				onResend: handleResend,
				onCancel: handleCancel,
			}),
		[handleResend, handleCancel],
	);

	if (error) {
		return (
			<div className="flex h-full flex-col">
				<PageHeader icon={IconMailPlus} title="Invitations" />
				<div className="flex flex-1 items-center justify-center">
					<p className="text-destructive">Error loading invitations</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconMailPlus} title="Invitations">
				<Button size="sm" onClick={() => setDialogOpen(true)}>
					<IconMailPlus className="mr-2 size-4" />
					Invite User
				</Button>
			</PageHeader>
			<div className="flex-1 overflow-auto p-6">
				{isLoading ? (
					<div className="flex h-32 items-center justify-center">
						<p className="text-muted-foreground">Loading...</p>
					</div>
				) : (
					<DataTable
						columns={columns}
						data={invitations}
						getRowId={(row) => row.id}
						mobileCard={(invitation) => (
							<InvitationMobileCard
								invitation={invitation}
								onResend={handleResend}
								onCancel={handleCancel}
							/>
						)}
						toolbar={(table) => (
							<DataTableToolbar
								table={table}
								searchKey="email"
								searchPlaceholder="Search invitations..."
							/>
						)}
					/>
				)}
			</div>

			<InviteUserDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				onSuccess={invalidate}
			/>
		</div>
	);
}
