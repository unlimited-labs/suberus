import { VAT_ID_STATUS_VIEW } from "@/features/settings/components/billing-details/vat-id-status";
import {
	CHANGED_AFTER_PAYMENT_LABEL,
	invoiceStateLabels,
	vatIdStatusLabels,
} from "@/features/users/labels";
import type { AdminUser } from "@/features/users/server/users";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";

export function VatIdStatusIcon({ check }: { check: AdminUser["vatIdCheck"] }) {
	if (!check || check.status === "NOT_CHECKABLE") return null;
	const { Icon, className } = VAT_ID_STATUS_VIEW[check.status];
	return (
		<Icon
			aria-label={`VAT ID: ${vatIdStatusLabels[check.status]}`}
			className={cn("size-4 shrink-0", className)}
			role="img"
		/>
	);
}

export function UserInvoiceCell({
	user,
	mobile,
}: {
	user: AdminUser;
	mobile?: boolean;
}) {
	return (
		<span
			className="flex items-center gap-1.5"
			data-testid="user-invoice-state"
		>
			{user.invoiceState === "NONE" && !mobile && (
				<span className="text-muted-foreground">—</span>
			)}
			{user.invoiceState !== "NONE" && (
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
					{CHANGED_AFTER_PAYMENT_LABEL}
				</Badge>
			)}
		</span>
	);
}
