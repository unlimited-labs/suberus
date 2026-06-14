import { IconMailForward, IconX } from "@tabler/icons-react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/admin/data-table";
import { roleLabels } from "@/features/users/labels";
import { invitationStatusConfig } from "@/lib/labels/invitation-status";
import type { AdminInvitation } from "@/lib/server/admin/invitations";
import { useDateFormat } from "@/shared/hooks/use-date-format";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";

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
