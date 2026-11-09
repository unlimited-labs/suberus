import { logActivityTx } from "@/features/activity-log/server/activity-log";
import { activityDetail } from "@/features/activity-log/types";
import {
	type BillingChanges,
	mergeBillingChanges,
} from "@/shared/lib/billing-changes";
import { prisma } from "@/shared/server/db.server";

const participantChangesSince = (userId: string, since: Date) => ({
	type: "USER_BILLING_DETAILS_UPDATED" as const,
	userId,
	performedBy: userId,
	createdAt: { gte: since },
});

export async function billingChangesAfterPayment(user: {
	id: string;
	billingChangedAfterPaymentAt: Date | null;
}): Promise<{ changes: BillingChanges; lastChangeAt: Date | null } | null> {
	if (!user.billingChangedAfterPaymentAt) return null;
	const entries = await prisma.activityLog.findMany({
		where: participantChangesSince(user.id, user.billingChangedAfterPaymentAt),
		orderBy: { createdAt: "asc" },
		select: { detail: true, createdAt: true },
	});
	return {
		changes: mergeBillingChanges(
			// SAFETY: USER_BILLING_DETAILS_UPDATED rows are written only by auditBillingChange with { changes }.
			entries.map(
				(entry) => (entry.detail as { changes: BillingChanges }).changes,
			),
		),
		lastChangeAt: entries.at(-1)?.createdAt ?? null,
	};
}

/** Clears only what the admin saw; a later participant edit keeps the flag, from that edit on. */
export async function acknowledgeBillingChange(
	userId: string,
	performedBy: string,
	seenUntil: Date,
): Promise<void> {
	await prisma.$transaction(async (tx) => {
		const { billingChangedAfterPaymentAt: changedAt } =
			await tx.user.findUniqueOrThrow({
				where: { id: userId },
				select: { billingChangedAfterPaymentAt: true },
			});
		if (!changedAt) return;
		const unseen = await tx.activityLog.findFirst({
			where: {
				...participantChangesSince(userId, changedAt),
				createdAt: { gte: changedAt, gt: seenUntil },
			},
			orderBy: { createdAt: "asc" },
			select: { createdAt: true },
		});
		await tx.user.update({
			where: { id: userId },
			data: { billingChangedAfterPaymentAt: unseen?.createdAt ?? null },
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
