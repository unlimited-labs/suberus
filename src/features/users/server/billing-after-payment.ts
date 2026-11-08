import { logActivityTx } from "@/features/activity-log/server/activity-log";
import { activityDetail } from "@/features/activity-log/types";
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

export async function acknowledgeBillingChange(
	userId: string,
	performedBy: string,
): Promise<void> {
	await prisma.$transaction(async (tx) => {
		const { billingChangedAfterPaymentAt: changedAt } =
			await tx.user.findUniqueOrThrow({
				where: { id: userId },
				select: { billingChangedAfterPaymentAt: true },
			});
		if (!changedAt) return;
		await tx.user.update({
			where: { id: userId },
			data: { billingChangedAfterPaymentAt: null },
		});
		await logActivityTx(tx, {
			type: "USER_BILLING_CHANGE_ACKNOWLEDGED",
			userId,
			performedBy,
			detail: activityDetail("USER_BILLING_CHANGE_ACKNOWLEDGED", {
				changedAt: changedAt.toISOString(),
			}),
		});
	});
}
