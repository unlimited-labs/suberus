import { prisma } from "@/shared/server/db.server";

export interface PushSubscriptionInput {
	endpoint: string;
	p256dh: string;
	auth: string;
}

export async function savePushSubscription(
	userId: string,
	sub: PushSubscriptionInput,
): Promise<void> {
	await prisma.pushSubscription.upsert({
		where: { endpoint: sub.endpoint },
		update: { userId, p256dh: sub.p256dh, auth: sub.auth },
		create: {
			userId,
			endpoint: sub.endpoint,
			p256dh: sub.p256dh,
			auth: sub.auth,
		},
	});
}

export async function deletePushSubscription(
	userId: string,
	endpoint: string,
): Promise<void> {
	await prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
}
