import webpush from "web-push";
import { env } from "@/env";
import { getSetting } from "@/features/settings/server/settings";
import { logger } from "@/logger";
import { prisma } from "@/shared/server/db.server";
import { getScheduleState } from "./schedule";
import { isReminderDue, slotStartAt } from "./slot-timing";

let vapidConfigured = false;

function configureVapid(): boolean {
	if (vapidConfigured) return true;
	const { VITE_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = env;
	if (!VITE_VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) {
		return false;
	}
	webpush.setVapidDetails(
		VAPID_SUBJECT,
		VITE_VAPID_PUBLIC_KEY,
		VAPID_PRIVATE_KEY,
	);
	vapidConfigured = true;
	return true;
}

export async function sendFavouriteReminders(): Promise<number> {
	if (!configureVapid()) return 0;

	const state = await getScheduleState();
	if (state.status !== "PUBLISHED") return 0;

	const leadMin = await getSetting("PROGRAM_REMINDER_LEAD_MIN");
	const now = Date.now();

	const favourites = await prisma.presentationFavorite.findMany({
		where: { remindedAt: null },
		select: {
			slotId: true,
			userId: true,
			slot: {
				select: {
					order: true,
					submission: { select: { title: true } },
					session: {
						select: {
							startAt: true,
							untimedSlots: true,
							room: { select: { name: true } },
							presentations: {
								select: { order: true, durationMin: true },
							},
						},
					},
				},
			},
		},
	});

	const due = favourites.filter((f) => {
		const start = f.slot.session.untimedSlots
			? f.slot.session.startAt.getTime()
			: slotStartAt(
					f.slot.session.startAt,
					f.slot.session.presentations,
					f.slot.order,
				).getTime();
		return isReminderDue(start, now, leadMin);
	});
	if (due.length === 0) return 0;

	const subs = await prisma.pushSubscription.findMany({
		where: { userId: { in: [...new Set(due.map((f) => f.userId))] } },
	});
	const subsByUser = new Map<string, typeof subs>();
	for (const s of subs) {
		const list = subsByUser.get(s.userId) ?? [];
		list.push(s);
		subsByUser.set(s.userId, list);
	}

	let sent = 0;
	const reminded: Array<{ slotId: string; userId: string }> = [];

	for (const f of due) {
		const userSubs = subsByUser.get(f.userId);
		if (!userSubs?.length) continue;

		const room = f.slot.session.room?.name;
		const payload = JSON.stringify({
			title: `Starting in ${leadMin} min`,
			body: room
				? `«${f.slot.submission.title}» — ${room}`
				: `«${f.slot.submission.title}»`,
			url: "/program",
		});

		let delivered = false;
		for (const s of userSubs) {
			try {
				await webpush.sendNotification(
					{
						endpoint: s.endpoint,
						keys: { p256dh: s.p256dh, auth: s.auth },
					},
					payload,
				);
				delivered = true;
				sent++;
			} catch (err) {
				const statusCode = (err as { statusCode?: number }).statusCode;
				if (statusCode === 404 || statusCode === 410) {
					await prisma.pushSubscription
						.delete({ where: { endpoint: s.endpoint } })
						.catch(() => {});
				} else {
					logger.warn(`[reminders] push failed: ${String(err)}`);
				}
			}
		}
		if (delivered) reminded.push({ slotId: f.slotId, userId: f.userId });
	}

	if (reminded.length > 0) {
		await prisma.presentationFavorite.updateMany({
			where: { OR: reminded },
			data: { remindedAt: new Date() },
		});
	}

	return sent;
}
