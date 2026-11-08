import { logActivity } from "@/features/activity-log/server/activity-log";
import { activityDetail } from "@/features/activity-log/types";
import type { ContactInfoFormData } from "@/features/profile/validations";
import {
	billingColumnsToDb,
	billingColumnsToForm,
	billingDetailsIssues,
	invoiceNeeded,
} from "@/features/settings/billing-details-rules";
import { getSetting } from "@/features/settings/server/settings";
import { checkVatIdInBackground } from "@/features/settings/server/vat-id-check";
import { normalizeVatIdOrThrow } from "@/shared/lib/vat-id";
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
			billingOrganization: true,
			billingStreet: true,
			billingPostalCode: true,
			billingCity: true,
			vatId: true,
			country: true,
			contactConsent: true,
		},
	});
	return {
		needInvoice: user.needInvoice,
		...billingColumnsToForm(user),
		country: user.country ?? "",
		contactConsent: user.contactConsent,
	};
}

export async function updateContactInfo(
	userId: string,
	data: Omit<Partial<ContactInfoFormData>, "email">,
) {
	const config = await getSetting("BILLING_DETAILS");
	const needInvoice = invoiceNeeded(data.needInvoice === true, config);
	const [issue] = billingDetailsIssues({ ...data, needInvoice }, config);
	if (issue) throw new Response(issue.message, { status: 400 });

	const result = await prisma.user.update({
		where: { id: userId },
		data: {
			needInvoice,
			...billingColumnsToDb({
				...data,
				vatId: normalizeVatIdOrThrow(data.vatId, data.country),
			}),
			country: data.country || null,
			contactConsent: data.contactConsent,
		},
	});

	checkVatIdInBackground(result.vatId);

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
