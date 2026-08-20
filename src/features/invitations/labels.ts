import type { InvitationStatus } from "@/generated/prisma/enums";

/** EXPIRED is actionable because resend revives it. UI affordance only — the
 * server guards these actions itself. */
export function isInvitationActionable(status: InvitationStatus): boolean {
	return status === "PENDING" || status === "EXPIRED";
}

export const invitationStatusConfig = {
	PENDING: { label: "Pending", variant: "secondary" },
	USED: { label: "Used", variant: "default" },
	EXPIRED: { label: "Expired", variant: "outline" },
	CANCELLED: { label: "Cancelled", variant: "destructive" },
} satisfies Record<
	string,
	{
		label: string;
		variant: "default" | "secondary" | "destructive" | "outline";
	}
>;
