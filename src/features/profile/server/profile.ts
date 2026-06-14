import { logActivity } from "@/features/activity-log/server/activity-log";
import { activityDetail } from "@/features/activity-log/types";
import { prisma } from "@/shared/server/db.server";

export async function getPersonalInfo(userId: string) {
	const user = await prisma.user.findUniqueOrThrow({
		where: { id: userId },
		select: {
			firstName: true,
			lastName: true,
			title: true,
			orcid: true,
			affiliation: { select: { name: true } },
		},
	});
	return {
		firstName: user.firstName ?? "",
		lastName: user.lastName ?? "",
		title: user.title ?? "",
		orcid: user.orcid ?? "",
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

export async function updateContactInfo(
	userId: string,
	data: {
		needInvoice?: boolean;
		address?: string;
		country?: string;
	},
) {
	const result = await prisma.user.update({
		where: { id: userId },
		data: {
			needInvoice: data.needInvoice,
			address: data.address || null,
			country: data.country || null,
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
