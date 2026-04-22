import { prisma } from "@/db.server";
import { activityDetail } from "@/lib/activity-log";
import { logActivity } from "@/lib/server/activity-log";
import { deleteFile, uploadFile } from "@/lib/server/storage";

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

function generateAvatarKey(userId: string, ext: string): string {
	return `avatars/${userId}/${Date.now()}.${ext}`;
}

export async function updateUserAvatar(
	userId: string,
	buffer: Buffer,
	mimeType: string,
) {
	const ext = mimeType.split("/")[1] || "jpg";
	const key = generateAvatarKey(userId, ext);

	// Delete old avatar if exists
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { image: true },
	});
	if (user?.image?.startsWith("avatars/")) {
		await deleteFile(user.image);
	}

	await uploadFile(buffer, key, mimeType);
	await prisma.user.update({
		where: { id: userId },
		data: { image: key },
	});

	return key;
}
