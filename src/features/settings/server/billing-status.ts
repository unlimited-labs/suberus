import { invoiceState } from "@/features/settings/billing-details-rules";
import { getSetting } from "@/features/settings/server/settings";
import { prisma } from "@/shared/server/db.server";

export const BILLING_SELECT = {
	needInvoice: true,
	billingText: true,
	billingOrganization: true,
	billingStreet: true,
	billingPostalCode: true,
	billingCity: true,
	vatId: true,
} as const;

export async function getInvoiceStateForUser(userId: string) {
	const [config, user] = await Promise.all([
		getSetting("BILLING_DETAILS"),
		prisma.user.findUniqueOrThrow({
			where: { id: userId },
			select: BILLING_SELECT,
		}),
	]);
	return invoiceState(user, config);
}
