import { prisma } from "@/db.server";
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
	return prisma.user.update({
		where: { id: userId },
		data: {
			firstName: data.firstName,
			lastName: data.lastName,
			title: data.title || null,
			affiliationId: data.affiliationId || null,
			orcid: data.orcid || null,
		},
	});
}

export async function updateContactInfo(
	userId: string,
	data: {
		address?: string;
		country?: string;
	},
) {
	return prisma.user.update({
		where: { id: userId },
		data: {
			address: data.address || null,
			country: data.country || null,
		},
	});
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
