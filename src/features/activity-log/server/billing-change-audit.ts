import type { Prisma } from "@/generated/prisma/client";
import {
	BILLING_AUDIT_SELECT,
	type BillingAuditValues,
	billingChanges,
} from "@/shared/lib/billing-changes";
import { prisma } from "@/shared/server/db.server";
import { activityDetail } from "../types";
import { logActivityTx } from "./activity-log";

export const BILLING_BEFORE_SELECT = {
	...BILLING_AUDIT_SELECT,
	fee: { select: { paid: true } },
} satisfies Prisma.UserSelect;

export async function auditBillingChange(
	tx: Prisma.TransactionClient,
	{
		userId,
		performedBy,
		byParticipant,
		before,
		after,
	}: {
		userId: string;
		performedBy: string;
		byParticipant: boolean;
		before: BillingAuditValues & { fee: { paid: boolean } | null };
		after: BillingAuditValues;
	},
): Promise<void> {
	const changes = billingChanges(before, after);
	if (!changes) return;
	const at = new Date();
	await logActivityTx(tx, {
		type: "USER_BILLING_DETAILS_UPDATED",
		userId,
		performedBy,
		createdAt: at,
		detail: activityDetail("USER_BILLING_DETAILS_UPDATED", { changes }),
	});
	if (byParticipant && before.fee?.paid) {
		await tx.user.updateMany({
			where: { id: userId, billingChangedAfterPaymentAt: null },
			data: { billingChangedAfterPaymentAt: at },
		});
	}
}

/** Updates the user and logs the billing diff in one transaction. */
export async function updateUserAuditingBilling(
	userId: string,
	data: Prisma.UserUpdateInput,
	audit: { performedBy: string; byParticipant: boolean },
) {
	return prisma.$transaction(async (tx) => {
		const before = await tx.user.findUniqueOrThrow({
			where: { id: userId },
			select: BILLING_BEFORE_SELECT,
		});
		const after = await tx.user.update({
			where: { id: userId },
			data,
			select: BILLING_AUDIT_SELECT,
		});
		await auditBillingChange(tx, { userId, ...audit, before, after });
		return { before, after };
	});
}
