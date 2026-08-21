import { IconMailForward, IconX } from "@tabler/icons-react";
import {
	invitationStatusConfig,
	isInvitationActionable,
} from "@/features/invitations/labels";
import type { AdminInvitation } from "@/features/invitations/server/invitations";
import { useDateFormat } from "@/shared/hooks/use-date-format";
import { roleLabels } from "@/shared/lib/labels/user-role";
import { lookup } from "@/shared/lib/lookup";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { DataTableColumnHeader } from "@/shared/ui/data-table";
import type { AppColumnDef } from "@/shared/ui/data-table/table-features";

interface InvitationColumnsOptions {
	onResend: (id: string) => void;
	onCancel: (id: string) => void;
}

function DateCell({ value }: { value: string }) {
	const { formatDate } = useDateFormat();
	return (
		<span className="text-muted-foreground text-sm">{formatDate(value)}</span>
	);
}

export function createInvitationColumns(
	options: InvitationColumnsOptions,
): AppColumnDef<AdminInvitation>[] {
	return [
		{
			accessorKey: "email",
			header: ({ column }) => (
				<DataTableColumnHeader
					column={column}
					textFilter={{ placeholder: "Search..." }}
					title="Email"
				/>
			),
			filterFn: "includesString",
		},
		{
			accessorKey: "role",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Role" />
			),
			cell: ({ row }) => {
				// SAFETY: TanStack's getValue is untyped; this column holds that type in the row model.
				const role = row.getValue("role") as string;
				return (
					<Badge variant="secondary">{lookup(roleLabels, role) ?? role}</Badge>
				);
			},
		},
		{
			accessorKey: "status",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Status" />
			),
			cell: ({ row }) => {
				// SAFETY: TanStack's getValue is untyped; this column holds that type in the row model.
				const status = row.getValue("status") as string;
				const config = lookup(invitationStatusConfig, status) ?? {
					label: status,
					variant: "outline" as const,
				};
				return <Badge variant={config.variant}>{config.label}</Badge>;
			},
		},
		{
			accessorKey: "expiresAt",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Expires" />
			),
			cell: ({ row }) => (
				// SAFETY: TanStack's getValue is untyped; this column holds that type in the row model.
				<DateCell value={row.getValue("expiresAt") as string} />
			),
		},
		{
			accessorKey: "createdAt",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Created" />
			),
			cell: ({ row }) => (
				// SAFETY: TanStack's getValue is untyped; this column holds that type in the row model.
				<DateCell value={row.getValue("createdAt") as string} />
			),
		},
		{
			id: "actions",
			cell: ({ row }) => {
				const invitation = row.original;
				if (!isInvitationActionable(invitation.status)) return null;

				return (
					<div className="flex gap-1">
						<Button
							onClick={() => options.onResend(invitation.id)}
							size="icon-sm"
							title="Resend"
							variant="ghost"
						>
							<IconMailForward className="size-4" />
						</Button>
						<Button
							onClick={() => options.onCancel(invitation.id)}
							size="icon-sm"
							title="Cancel"
							variant="ghost"
						>
							<IconX className="size-4" />
						</Button>
					</div>
				);
			},
		},
	];
}
