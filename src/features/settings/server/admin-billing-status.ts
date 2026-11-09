import { invoiceState } from "@/features/settings/billing-details-rules";
import {
	type BillingDetailsSettings,
	STRUCTURED_BILLING_FIELDS,
} from "@/features/settings/billing-details-schema";
import { BILLING_AUDIT_SELECT } from "@/shared/lib/billing-changes";
import { prisma } from "@/shared/server/db.server";

export async function countIncompleteUsers(
	config: BillingDetailsSettings,
): Promise<number> {
	const users = await prisma.user.findMany({
		where: { isActive: true, role: { not: "ADMIN" } },
		select: { ...BILLING_AUDIT_SELECT, role: true, isActive: true },
	});
	return users.filter((u) => invoiceState(u, config) === "INCOMPLETE").length;
}

export function countUsersWithOtherFormData(
	draftMode: BillingDetailsSettings["mode"],
): Promise<number> {
	return prisma.user.count({
		where:
			draftMode === "FREE_TEXT"
				? {
						OR: STRUCTURED_BILLING_FIELDS.map((f) => ({
							[f.column]: { not: null },
						})),
					}
				: { billingText: { not: null } },
	});
}
