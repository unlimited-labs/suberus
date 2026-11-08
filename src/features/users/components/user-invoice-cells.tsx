import {
	IconAlertTriangle,
	IconCircleCheck,
	IconClock,
} from "@tabler/icons-react";
import { invoiceStateLabels, vatIdStatusLabels } from "@/features/users/labels";
import type { AdminUser } from "@/features/users/server/users";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";

const VAT_ICONS = {
	VERIFIED: { Icon: IconCircleCheck, className: "text-green-600" },
	NOT_FOUND: { Icon: IconAlertTriangle, className: "text-amber-600" },
	UNAVAILABLE: { Icon: IconClock, className: "text-muted-foreground" },
} as const;

export function VatIdStatusIcon({ check }: { check: AdminUser["vatIdCheck"] }) {
	if (!check || check.status === "NOT_CHECKABLE") return null;
	const { Icon, className } = VAT_ICONS[check.status];
	return (
		<Icon
			aria-label={`VAT ID: ${vatIdStatusLabels[check.status]}`}
			className={cn("size-4 shrink-0", className)}
			role="img"
		/>
	);
}

export function UserInvoiceCell({ user }: { user: AdminUser }) {
	return (
		<span
			className="flex items-center gap-1.5"
			data-testid="user-invoice-state"
		>
			{user.invoiceState === "NONE" ? (
				<span className="text-muted-foreground">—</span>
			) : (
				<Badge
					variant={
						user.invoiceState === "INCOMPLETE" ? "destructive" : "secondary"
					}
				>
					{invoiceStateLabels[user.invoiceState]}
				</Badge>
			)}
			<VatIdStatusIcon check={user.vatIdCheck} />
			{user.billingChangedAfterPaymentAt && (
				<Badge data-testid="billing-changed-after-payment" variant="outline">
					Changed after payment
				</Badge>
			)}
		</span>
	);
}
