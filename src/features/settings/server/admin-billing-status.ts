import { invoiceState } from "@/features/settings/billing-details-rules";
import type { BillingDetailsSettings } from "@/features/settings/billing-details-schema";
import { prisma } from "@/shared/server/db.server";
import { BILLING_SELECT } from "./billing-status";

export async function countIncompleteUsers(
	config: BillingDetailsSettings,
): Promise<number> {
	const users = await prisma.user.findMany({ select: BILLING_SELECT });
	return users.filter((u) => invoiceState(u, config) === "INCOMPLETE").length;
}
