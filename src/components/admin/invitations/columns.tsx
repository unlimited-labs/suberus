import { IconMailForward, IconX } from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { invitationStatusConfig } from "@/lib/labels/invitation-status";
import { roleLabels } from "@/lib/labels/user";
import type { AdminInvitation } from "@/lib/server/admin/invitations";

interface InvitationColumnsOptions {
	onResend: (id: string) => void;
	onCancel: (id: string) => void;
}

export function createInvitationColumns(
	options: InvitationColumnsOptions,
): ColumnDef<AdminInvitation>[] {
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
				const config = invitationStatusConfig[status] ?? {
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
			cell: ({ row }) => {
				const date = new Date(row.getValue("expiresAt") as string);
				return (
					<span className="text-sm text-muted-foreground">
						{date.toLocaleDateString()}
					</span>
				);
			},
		},
		{
			accessorKey: "createdAt",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Created" />
			),
			cell: ({ row }) => {
				const date = new Date(row.getValue("createdAt") as string);
				return (
					<span className="text-sm text-muted-foreground">
						{date.toLocaleDateString()}
					</span>
				);
			},
		},
		{
			id: "actions",
			cell: ({ row }) => {
				const invitation = row.original;
				if (invitation.status !== "PENDING") return null;

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
