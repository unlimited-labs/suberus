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
		<span className="text-sm text-muted-foreground">{formatDate(value)}</span>
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
					title="Email"
					textFilter={{ placeholder: "Search..." }}
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
				const role = row.getValue("role") as string;
				return (
					<Badge variant="secondary">
						{roleLabels[role as keyof typeof roleLabels] ?? role}
					</Badge>
				);
			},
		},
		{
			accessorKey: "status",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Status" />
			),
			cell: ({ row }) => {
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
				<DateCell value={row.getValue("expiresAt") as string} />
			),
		},
		{
			accessorKey: "createdAt",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Created" />
			),
			cell: ({ row }) => (
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
							variant="ghost"
							size="icon-sm"
							onClick={() => options.onResend(invitation.id)}
							title="Resend"
						>
							<IconMailForward className="size-4" />
						</Button>
						<Button
							variant="ghost"
							size="icon-sm"
							onClick={() => options.onCancel(invitation.id)}
							title="Cancel"
						>
							<IconX className="size-4" />
						</Button>
					</div>
				);
			},
		},
	];
}
