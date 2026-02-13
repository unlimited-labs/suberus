import { IconMailForward, IconX } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { roleLabels } from "@/lib/labels/user";
import type { AdminInvitation } from "@/lib/server/admin/invitations";

const statusConfig: Record<
	string,
	{
		label: string;
		variant: "default" | "secondary" | "destructive" | "outline";
	}
> = {
	PENDING: { label: "Pending", variant: "secondary" },
	USED: { label: "Used", variant: "default" },
	EXPIRED: { label: "Expired", variant: "outline" },
	CANCELLED: { label: "Cancelled", variant: "destructive" },
};

interface InvitationMobileCardProps {
	invitation: AdminInvitation;
	onResend: (id: string) => void;
	onCancel: (id: string) => void;
}

export function InvitationMobileCard({
	invitation,
	onResend,
	onCancel,
}: InvitationMobileCardProps) {
	const status = statusConfig[invitation.status] ?? {
		label: invitation.status,
		variant: "outline" as const,
	};

	return (
		<Card>
			<CardContent className="p-4">
				<div className="flex items-start justify-between">
					<div>
						<p className="font-medium">{invitation.email}</p>
						<p className="text-sm text-muted-foreground">
							Expires: {new Date(invitation.expiresAt).toLocaleDateString()}
						</p>
					</div>
					<div className="flex flex-col items-end gap-1">
						<Badge variant="secondary">
							{roleLabels[invitation.role as keyof typeof roleLabels]}
						</Badge>
						<Badge variant={status.variant}>{status.label}</Badge>
					</div>
				</div>
				{invitation.status === "PENDING" && (
					<div className="mt-2 flex gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => onResend(invitation.id)}
						>
							<IconMailForward className="mr-1 size-3.5" />
							Resend
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => onCancel(invitation.id)}
						>
							<IconX className="mr-1 size-3.5" />
							Cancel
						</Button>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
