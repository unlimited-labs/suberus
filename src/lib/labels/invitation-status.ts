export const invitationStatusConfig: Record<
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
