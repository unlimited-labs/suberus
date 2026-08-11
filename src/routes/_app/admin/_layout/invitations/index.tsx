import { IconMailPlus } from "@tabler/icons-react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { adminOnlyRouteMiddleware } from "@/features/auth/server/middleware";
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
	server: {
		middleware: [adminOnlyRouteMiddleware],
	},
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

	const invalidate = () =>
		queryClient.invalidateQueries({
			queryKey: adminInvitationsQueryOptions().queryKey,
		});

	const handleResend = async (id: string) => {
		try {
			const { success } = await resendInvitationFn({ data: { id } });
			invalidate();
			if (!success) {
				toast.error(
					"Could not send the invitation email — check SMTP and that the “Invitation” template is enabled",
				);
				return;
			}
			toast.success("Invitation resent");
		} catch {
			toast.error("Failed to resend invitation");
		}
	};

	const handleCancel = async (id: string) => {
		try {
			const { success } = await cancelInvitationFn({ data: { id } });
			invalidate();
			if (!success) {
				toast.error("Failed to cancel invitation");
				return;
			}
			toast.success("Invitation cancelled");
		} catch {
			toast.error("Failed to cancel invitation");
		}
	};

	const columns = createInvitationColumns({
		onResend: handleResend,
		onCancel: handleCancel,
	});

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
