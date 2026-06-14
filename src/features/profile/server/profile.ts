import { logActivity } from "@/features/activity-log/server/activity-log";
import { activityDetail } from "@/features/activity-log/types";
import { SUPPORTED_IMAGE_EXTENSIONS } from "@/features/settings/file-types";
import { prisma } from "@/shared/server/db.server";
import { deleteFile, uploadFile } from "@/shared/server/storage";
import { validateUpload } from "@/shared/server/validate-upload";

/** Avatar images are capped at 5MB (matches the upload UI). */
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

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

function generateAvatarKey(userId: string, ext: string): string {
	return `avatars/${userId}/${Date.now()}.${ext}`;
}

export async function updateUserAvatar(userId: string, buffer: Buffer) {
	const detected = await validateUpload(buffer, {
		allowedExtensions: SUPPORTED_IMAGE_EXTENSIONS,
		maxBytes: MAX_AVATAR_BYTES,
	});
	const key = generateAvatarKey(userId, detected.ext);

	// Delete old avatar if exists
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { image: true },
	});
	if (user?.image?.startsWith("avatars/")) {
		await deleteFile(user.image);
	}

	await uploadFile(buffer, key, detected.mime);
	await prisma.user.update({
		where: { id: userId },
		data: { image: key },
	});

	return key;
}
