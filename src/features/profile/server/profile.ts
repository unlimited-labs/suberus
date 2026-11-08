import { logActivity } from "@/features/activity-log/server/activity-log";
import { activityDetail } from "@/features/activity-log/types";
import {
	billingTextError,
	invoiceNeeded,
} from "@/features/settings/billing-details-rules";
import { getSetting } from "@/features/settings/server/settings";
import { prisma } from "@/shared/server/db.server";

export async function getPersonalInfo(userId: string) {
	const user = await prisma.user.findUniqueOrThrow({
		where: { id: userId },
		select: {
			firstName: true,
			lastName: true,
			title: true,
			orcid: true,
			website: true,
			linkedin: true,
			affiliation: { select: { name: true } },
		},
	});
	return {
		firstName: user.firstName ?? "",
		lastName: user.lastName ?? "",
		title: user.title ?? "",
		orcid: user.orcid ?? "",
		website: user.website ?? "",
		linkedin: user.linkedin ?? "",
		affiliation: user.affiliation?.name ?? "",
	};
}

export async function updatePersonalInfo(
	userId: string,
	data: {
		firstName: string;
		lastName: string;
		title?: string;
		affiliationId?: string;
		orcid?: string;
		website?: string;
		linkedin?: string;
	},
) {
	const result = await prisma.user.update({
		where: { id: userId },
		data: {
			firstName: data.firstName,
			lastName: data.lastName,
			title: data.title || null,
			affiliationId: data.affiliationId || null,
			orcid: data.orcid || null,
			website: data.website || null,
			linkedin: data.linkedin || null,
		},
	});

	await logActivity({
		type: "USER_PROFILE_UPDATED",
		userId,
		performedBy: userId,
		detail: activityDetail("USER_PROFILE_UPDATED", {
			fields: Object.keys(data),
		}),
	});

	return result;
}

export async function getContactInfo(userId: string) {
	const user = await prisma.user.findUniqueOrThrow({
		where: { id: userId },
		select: {
			needInvoice: true,
			billingText: true,
			country: true,
			contactConsent: true,
		},
	});
	return {
		needInvoice: user.needInvoice,
		billingText: user.billingText ?? "",
		country: user.country ?? "",
		contactConsent: user.contactConsent,
	};
}

export async function updateContactInfo(
	userId: string,
	data: {
		needInvoice?: boolean;
		billingText?: string;
		country?: string;
		contactConsent?: boolean;
	},
) {
	const config = await getSetting("BILLING_DETAILS");
	const needInvoice = invoiceNeeded(data.needInvoice === true, config);
	const message = billingTextError(data.billingText, needInvoice);
	if (message) throw new Response(message, { status: 400 });

	const result = await prisma.user.update({
		where: { id: userId },
		data: {
			needInvoice,
			billingText: data.billingText || null,
			country: data.country || null,
			contactConsent: data.contactConsent,
		},
	});

	await logActivity({
		type: "USER_PROFILE_UPDATED",
		userId,
		performedBy: userId,
		detail: activityDetail("USER_PROFILE_UPDATED", {
			fields: Object.keys(data),
		}),
	});

	return result;
}
