import { IconMailForward, IconX } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDateFormat } from "@/hooks/use-date-format";
import { invitationStatusConfig } from "@/lib/labels/invitation-status";
import { roleLabels } from "@/lib/labels/user";
import type { AdminInvitation } from "@/lib/server/admin/invitations";

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
	const { formatDate } = useDateFormat();
	const status = invitationStatusConfig[invitation.status] ?? {
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
							Expires: {formatDate(invitation.expiresAt)}
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
