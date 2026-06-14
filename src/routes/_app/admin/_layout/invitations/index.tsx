import { IconMailPlus } from "@tabler/icons-react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import {
	adminInvitationsQueryOptions,
	cancelInvitationFn,
	resendInvitationFn,
} from "@/features/invitations/api/admin-invitations";
import { createInvitationColumns } from "@/features/invitations/components/columns";
import { InvitationMobileCard } from "@/features/invitations/components/invitation-mobile-card";
import { InviteUserDialog } from "@/features/invitations/components/invite-user-dialog";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/ui/button";
import { DataTable, DataTableToolbar } from "@/shared/ui/data-table";

export const Route = createFileRoute("/_app/admin/_layout/invitations/")({
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(adminInvitationsQueryOptions());
	},
	component: InvitationsPage,
});

function InvitationsPage() {
	const queryClient = useQueryClient();
	const [dialogOpen, setDialogOpen] = useState(false);

	const { data: invitations } = useSuspenseQuery(
		adminInvitationsQueryOptions(),
	);

	const invalidate = useCallback(
		() =>
			queryClient.invalidateQueries({
				queryKey: adminInvitationsQueryOptions().queryKey,
			}),
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

	return (
		<div className="flex h-full flex-col">
			<PageHeader icon={IconMailPlus} title="Invitations">
				<Button size="sm" onClick={() => setDialogOpen(true)}>
					<IconMailPlus className="mr-2 size-4" />
					Invite User
				</Button>
			</PageHeader>
			<div className="flex-1 overflow-auto p-6">
				<DataTable
					columns={columns}
					data={invitations}
					getRowId={(row) => row.id}
					rowDataTestId="invitation-item"
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
			</div>

			<InviteUserDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				onSuccess={invalidate}
			/>
		</div>
	);
}
