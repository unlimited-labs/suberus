import {
	type BillingChanges,
	mergeBillingChanges,
} from "@/shared/lib/billing-changes";
import { prisma } from "@/shared/server/db.server";

export async function billingChangesAfterPayment(user: {
	id: string;
	billingChangedAfterPaymentAt: Date | null;
}): Promise<BillingChanges | null> {
	if (!user.billingChangedAfterPaymentAt) return null;
	const entries = await prisma.activityLog.findMany({
		where: {
			type: "USER_BILLING_DETAILS_UPDATED",
			userId: user.id,
			performedBy: user.id,
			createdAt: { gte: user.billingChangedAfterPaymentAt },
		},
		orderBy: { createdAt: "asc" },
		select: { detail: true },
	});
	return mergeBillingChanges(
		// SAFETY: USER_BILLING_DETAILS_UPDATED rows are written only by auditBillingChange with { changes }.
		entries.map(
			(entry) => (entry.detail as { changes: BillingChanges }).changes,
		),
	);
}

export async function acknowledgeBillingChange(userId: string): Promise<void> {
	await prisma.user.update({
		where: { id: userId },
		data: { billingChangedAfterPaymentAt: null },
	});
}
