import type { Prisma } from "@/generated/prisma/client";
import {
	type BillingAuditField,
	type BillingAuditValues,
	billingChanges,
} from "@/shared/lib/billing-changes";
import type { prisma } from "@/shared/server/db.server";
import { activityDetail } from "../types";
import { logActivityTx } from "./activity-log";

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export const BILLING_AUDIT_SELECT = {
	needInvoice: true,
	billingText: true,
	billingOrganization: true,
	billingStreet: true,
	billingPostalCode: true,
	billingCity: true,
	vatId: true,
	country: true,
} satisfies Prisma.UserSelect & Record<BillingAuditField, true>;

export const BILLING_BEFORE_SELECT = {
	...BILLING_AUDIT_SELECT,
	fee: { select: { paid: true } },
} satisfies Prisma.UserSelect;

export async function auditBillingChange(
	tx: Tx,
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
