import type { PrintLogo } from "@/features/planner/print/print-document-rules";
import { printImageInfo } from "@/features/planner/print/print-image-rules";
import {
	type PrintOptions,
	printOptionsSchema,
} from "@/features/planner/print/print-options-schema";
import type { PrintSource } from "@/features/planner/print/print-program-rules";
import { getBrandingLogoBuffer } from "@/features/settings/server/branding";
import { getSetting, getSettings } from "@/features/settings/server/settings";
import { resolveZone } from "@/shared/lib/zoned";
import { prisma } from "@/shared/server/db.server";

export async function loadPrintSource(): Promise<PrintSource> {
	const [settings, rooms, sessions, items] = await Promise.all([
		getSettings([
			"CONFERENCE_NAME",
			"CONFERENCE_DATE_START",
			"CONFERENCE_DATE_END",
			"CONFERENCE_TIMEZONE",
			"TIME_FORMAT",
			"SCHEDULE_STATE",
			"PROGRAM_BADGES",
		]),
		prisma.room.findMany({ select: { id: true, name: true, order: true } }),
		prisma.programSession.findMany({
			select: {
				id: true,
				title: true,
				startAt: true,
				endAt: true,
				untimedSlots: true,
				roomId: true,
				track: { select: { name: true, color: true } },
				chairs: {
					select: {
						user: {
							select: {
								id: true,
								firstName: true,
								lastName: true,
								email: true,
								title: true,
							},
						},
					},
				},
				presentations: {
					select: {
						id: true,
						order: true,
						durationMin: true,
						cancelled: true,
						badgeId: true,
						submission: {
							select: {
								id: true,
								sequentialNumber: true,
								title: true,
								type: true,
								presenterId: true,
								authors: {
									select: {
										id: true,
										userId: true,
										email: true,
										firstName: true,
										lastName: true,
										orderIndex: true,
										isPresenter: true,
										user: { select: { title: true } },
										affiliation: { select: { name: true } },
									},
								},
							},
						},
					},
				},
			},
		}),
		prisma.scheduleBreak.findMany({
			select: {
				id: true,
				kind: true,
				title: true,
				description: true,
				location: true,
				roomId: true,
				startAt: true,
				endAt: true,
			},
		}),
	]);

	return {
		conferenceName: settings.CONFERENCE_NAME,
		startDate: settings.CONFERENCE_DATE_START,
		endDate: settings.CONFERENCE_DATE_END,
		timeZone: resolveZone(settings.CONFERENCE_TIMEZONE),
		timeFormat: settings.TIME_FORMAT,
		draft: settings.SCHEDULE_STATE.status !== "PUBLISHED",
		rooms,
		badges: settings.PROGRAM_BADGES.map((b) => ({ id: b.id, label: b.label })),
		sessions: sessions.map(({ chairs, presentations, ...s }) => ({
			...s,
			chairs: chairs.map(({ user }) => ({
				userId: user.id,
				email: user.email,
				firstName: user.firstName,
				lastName: user.lastName,
				title: user.title,
			})),
			slots: presentations.map(({ submission, ...slot }) => ({
				...slot,
				submission: {
					...submission,
					authors: submission.authors.map(({ user, affiliation, ...a }) => ({
						...a,
						title: user?.title ?? null,
						affiliation: affiliation?.name ?? null,
					})),
				},
			})),
		})),
		items,
	};
}

export async function loadPrintLogo(): Promise<PrintLogo | null> {
	const buffer = await getBrandingLogoBuffer();
	if (!buffer) return null;
	const info = printImageInfo(buffer);
	if (!info || info.width === 0 || info.height === 0) return null;
	return {
		mime: info.mime,
		dataBase64: buffer.toString("base64"),
		aspectRatio: info.width / info.height,
	};
}

export async function getPrintOptions(): Promise<PrintOptions> {
	// A setting saved by an older schema falls back to defaults; it only pre-fills the export page.
	const parsed = printOptionsSchema.safeParse(
		await getSetting("PRINT_EXPORT_OPTIONS"),
	);
	return parsed.success ? parsed.data : printOptionsSchema.parse({});
}
