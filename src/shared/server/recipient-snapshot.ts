import type { RecipientSnapshot } from "@/shared/lib/placeholders";
import {
	buildRecipientSnapshot,
	type SnapshotUser,
} from "@/shared/lib/recipient-snapshot";
import { prisma } from "@/shared/server/db.server";

const RECIPIENT_USER_SELECT = {
	id: true,
	email: true,
	firstName: true,
	lastName: true,
	submissions: {
		where: { type: { not: "INVITED" } },
		select: { title: true },
	},
} as const;

export async function loadSnapshotUsers(
	userIds: readonly string[],
): Promise<SnapshotUser[]> {
	return prisma.user.findMany({
		where: { id: { in: [...new Set(userIds)] } },
		select: RECIPIENT_USER_SELECT,
	});
}

export async function loadRecipientSnapshots(
	userIds: readonly string[],
): Promise<RecipientSnapshot[]> {
	const users = await loadSnapshotUsers(userIds);
	return users.map(buildRecipientSnapshot);
}
