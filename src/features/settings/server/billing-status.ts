import { invoiceState } from "@/features/settings/billing-details-rules";
import { getSetting } from "@/features/settings/server/settings";
import { BILLING_AUDIT_SELECT } from "@/shared/lib/billing-changes";
import { prisma } from "@/shared/server/db.server";

export async function getInvoiceStateForUser(userId: string) {
	const [config, user] = await Promise.all([
		getSetting("BILLING_DETAILS"),
		prisma.user.findUniqueOrThrow({
			where: { id: userId },
			select: BILLING_AUDIT_SELECT,
		}),
	]);
	return invoiceState(user, config);
}
