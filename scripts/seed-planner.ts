/**
 * Planner test data seeder.
 *
 * Usage:
 *   pnpm tsx scripts/seed-planner.ts              # seed authors + submissions + rooms + tracks
 *   pnpm tsx scripts/seed-planner.ts --with-sessions  # additionally seed sessions + slots + breaks
 *   pnpm tsx scripts/seed-planner.ts --clean      # wipe only seeded data, leave rest alone
 *
 * Idempotent: all seeded rows carry identifiable markers
 *   - users: email "seed-author-<n>@example.local"
 *   - rooms: name prefix "SEED · "
 *   - program tracks: name prefix "SEED · "
 *   - sessions / breaks: title prefix "SEED · "
 *   - submissions: identified via their owner being a seeded user
 */

import { faker } from "@faker-js/faker";
import { prisma } from "@/db.server";

const SEED_EMAIL_RE = /^seed-author-\d+@example\.local$/;
const SEED_PREFIX = "SEED · ";

const NUM_AUTHORS = 15;
const NUM_SUBMISSIONS = 40;
const NUM_ROOMS = 4;
const NUM_PROGRAM_TRACKS = 6;

const TRACK_COLORS = [
	"#ef4444",
	"#f97316",
	"#eab308",
	"#22c55e",
	"#14b8a6",
	"#3b82f6",
	"#8b5cf6",
	"#ec4899",
];

const KEYWORDS = [
	"machine learning",
	"natural language processing",
	"computer vision",
	"reinforcement learning",
	"graph neural networks",
	"transformers",
	"optimization",
	"distributed systems",
	"security",
	"privacy",
	"robotics",
	"bioinformatics",
	"data mining",
	"time series",
	"recommender systems",
	"federated learning",
	"explainability",
	"benchmarking",
];

function pickN<T>(arr: T[], n: number): T[] {
	return faker.helpers.arrayElements(arr, n);
}

async function clean(): Promise<void> {
	console.log("Cleaning previously seeded planner data…");

	const seedUsers = await prisma.user.findMany({
		where: { email: { contains: "seed-author-" } },
		select: { id: true, email: true },
	});
	const seedUserIds = seedUsers
		.filter((u) => SEED_EMAIL_RE.test(u.email))
		.map((u) => u.id);

	const seedSubmissions = await prisma.submission.findMany({
		where: { userId: { in: seedUserIds } },
		select: { id: true },
	});
	const seedSubmissionIds = seedSubmissions.map((s) => s.id);

	// In dependency order (children first).
	const deleted = await prisma.$transaction([
		prisma.presentationSlot.deleteMany({
			where: { submissionId: { in: seedSubmissionIds } },
		}),
		prisma.programSession.deleteMany({
			where: { title: { startsWith: SEED_PREFIX } },
		}),
		prisma.scheduleBreak.deleteMany({
			where: { title: { startsWith: SEED_PREFIX } },
		}),
		prisma.programTrack.deleteMany({
			where: { name: { startsWith: SEED_PREFIX } },
		}),
		prisma.room.deleteMany({
			where: { name: { startsWith: SEED_PREFIX } },
		}),
		prisma.submissionAuthor.deleteMany({
			where: { submissionId: { in: seedSubmissionIds } },
		}),
		prisma.submissionKeyword.deleteMany({
			where: { submissionId: { in: seedSubmissionIds } },
		}),
		prisma.submissionVersion.deleteMany({
			where: { submissionId: { in: seedSubmissionIds } },
		}),
		prisma.submission.updateMany({
			where: { id: { in: seedSubmissionIds } },
			data: { currentVersionId: null },
		}),
		prisma.submission.deleteMany({
			where: { id: { in: seedSubmissionIds } },
		}),
		prisma.user.deleteMany({ where: { id: { in: seedUserIds } } }),
	]);

	console.log(`  removed: ${deleted.map((d) => d.count).join(" / ")}`);
}

async function seedAuthors(): Promise<string[]> {
	console.log(`Seeding ${NUM_AUTHORS} authors…`);
	const userIds: string[] = [];
	for (let i = 0; i < NUM_AUTHORS; i++) {
		const firstName = faker.person.firstName();
		const lastName = faker.person.lastName();
		const user = await prisma.user.create({
			data: {
				email: `seed-author-${i}@example.local`,
				firstName,
				lastName,
				emailVerified: true,
				role: "AUTHOR",
			},
			select: { id: true },
		});
		userIds.push(user.id);
	}
	return userIds;
}

async function seedSubmissions(authorUserIds: string[]): Promise<void> {
	console.log(`Seeding ${NUM_SUBMISSIONS} accepted submissions…`);

	// Ensure keywords exist
	const keywordRecords = await Promise.all(
		KEYWORDS.map((name) =>
			prisma.keyword.upsert({
				where: { name },
				update: {},
				create: { name },
				select: { id: true, name: true },
			}),
		),
	);

	for (let i = 0; i < NUM_SUBMISSIONS; i++) {
		const owner = faker.helpers.arrayElement(authorUserIds);
		const coAuthorCount = faker.number.int({ min: 0, max: 3 });
		const coAuthorIds = pickN(
			authorUserIds.filter((id) => id !== owner),
			coAuthorCount,
		);

		const title = faker.lorem
			.sentence({ min: 6, max: 12 })
			.replace(/\.$/, "");
		const abstract = faker.lorem.paragraphs(2, "\n\n");

		const submission = await prisma.submission.create({
			data: {
				type: "ABSTRACT",
				title,
				content: abstract,
				status: "ACCEPTED",
				userId: owner,
				authors: {
					create: [
						{
							firstName: faker.person.firstName(),
							lastName: faker.person.lastName(),
							email: `seed-author-${i}-primary@example.local`,
							orderIndex: 0,
							isPresenter: true,
							userId: owner,
						},
						...coAuthorIds.map((uid, idx) => ({
							firstName: faker.person.firstName(),
							lastName: faker.person.lastName(),
							email: `seed-author-${i}-co${idx}@example.local`,
							orderIndex: idx + 1,
							isPresenter: false,
							userId: uid,
						})),
					],
				},
				keywords: {
					create: pickN(keywordRecords, faker.number.int({ min: 2, max: 4 })).map(
						(kw) => ({ keywordId: kw.id }),
					),
				},
			},
			select: { id: true },
		});

		// Presenter link
		const presenter = await prisma.submissionAuthor.findFirst({
			where: { submissionId: submission.id, isPresenter: true },
			select: { id: true },
		});
		if (presenter) {
			await prisma.submission.update({
				where: { id: submission.id },
				data: { presenterId: presenter.id },
			});
		}
	}
}

async function seedRooms(): Promise<string[]> {
	console.log(`Seeding ${NUM_ROOMS} rooms…`);
	const ids: string[] = [];
	for (let i = 0; i < NUM_ROOMS; i++) {
		const r = await prisma.room.create({
			data: {
				name: `${SEED_PREFIX}${["Aula Magna", "Hall A", "Hall B", "Room 101"][i] ?? `Room ${i + 1}`}`,
				capacity: faker.helpers.arrayElement([60, 120, 250, 400]),
				order: i,
			},
			select: { id: true },
		});
		ids.push(r.id);
	}
	return ids;
}

async function seedProgramTracks(): Promise<string[]> {
	console.log(`Seeding ${NUM_PROGRAM_TRACKS} program tracks…`);
	const names = ["ML 1", "ML 2", "NLP", "Vision", "Systems", "Theory"];
	const ids: string[] = [];
	for (let i = 0; i < NUM_PROGRAM_TRACKS; i++) {
		const name = `${SEED_PREFIX}${names[i] ?? faker.lorem.word()}`;
		const seriesMatch = name.match(/^(.+?)\s+(\d+)$/);
		const t = await prisma.programTrack.create({
			data: {
				name,
				color: TRACK_COLORS[i % TRACK_COLORS.length],
				series: seriesMatch ? seriesMatch[1].trim() : null,
				seriesOrder: seriesMatch ? Number.parseInt(seriesMatch[2], 10) : null,
			},
			select: { id: true },
		});
		ids.push(t.id);
	}
	return ids;
}

async function seedSessionsAndBreaks(
	roomIds: string[],
	trackIds: string[],
	authorUserIds: string[],
): Promise<void> {
	console.log("Seeding sessions, chairs, slots, breaks…");

	// Use the conference start date if set, else tomorrow.
	const startSetting = await prisma.appSetting.findUnique({
		where: { key: "CONFERENCE_DATE_START" },
	});
	const baseDate =
		typeof startSetting?.value === "string" && startSetting.value
			? new Date(startSetting.value)
			: new Date(Date.now() + 24 * 3600 * 1000);
	baseDate.setUTCHours(9, 0, 0, 0);

	const submissions = await prisma.submission.findMany({
		where: { status: "ACCEPTED", presentationSlot: null },
		select: { id: true },
		take: 24,
	});

	// Build 6 sessions: 2 days × 3 morning/afternoon slots, alternating rooms.
	const slotSpecs = [
		{ dayOffset: 0, startHour: 9, endHour: 10.5 },
		{ dayOffset: 0, startHour: 11, endHour: 12.5 },
		{ dayOffset: 0, startHour: 14, endHour: 15.5 },
		{ dayOffset: 1, startHour: 9, endHour: 10.5 },
		{ dayOffset: 1, startHour: 11, endHour: 12.5 },
		{ dayOffset: 1, startHour: 14, endHour: 15.5 },
	];

	let submissionCursor = 0;
	for (let i = 0; i < slotSpecs.length; i++) {
		const spec = slotSpecs[i];
		const start = new Date(baseDate);
		start.setUTCDate(start.getUTCDate() + spec.dayOffset);
		start.setUTCHours(
			Math.floor(spec.startHour),
			(spec.startHour % 1) * 60,
			0,
			0,
		);
		const end = new Date(baseDate);
		end.setUTCDate(end.getUTCDate() + spec.dayOffset);
		end.setUTCHours(Math.floor(spec.endHour), (spec.endHour % 1) * 60, 0, 0);

		const roomId = roomIds[i % roomIds.length];
		const trackId = trackIds[i % trackIds.length];

		const session = await prisma.programSession.create({
			data: {
				title: `${SEED_PREFIX}${faker.lorem.words({ min: 2, max: 4 })}`,
				startAt: start,
				endAt: end,
				roomId,
				trackId,
			},
			select: { id: true },
		});

		// 1-2 chairs per session
		const chairUserIds = pickN(authorUserIds, faker.number.int({ min: 1, max: 2 }));
		for (const uid of chairUserIds) {
			await prisma.programSessionChair.create({
				data: { sessionId: session.id, userId: uid },
			});
		}

		// 3 presentation slots per session (15 min each)
		for (let s = 0; s < 3 && submissionCursor < submissions.length; s++) {
			await prisma.presentationSlot.create({
				data: {
					sessionId: session.id,
					submissionId: submissions[submissionCursor].id,
					order: s,
					durationMin: 15,
				},
			});
			submissionCursor++;
		}
	}

	// 2 breaks per day: coffee + lunch
	for (const dayOffset of [0, 1]) {
		for (const spec of [
			{ title: "Coffee", startHour: 10.5, endHour: 11 },
			{ title: "Lunch", startHour: 12.5, endHour: 14 },
		]) {
			const start = new Date(baseDate);
			start.setUTCDate(start.getUTCDate() + dayOffset);
			start.setUTCHours(
				Math.floor(spec.startHour),
				(spec.startHour % 1) * 60,
				0,
				0,
			);
			const end = new Date(baseDate);
			end.setUTCDate(end.getUTCDate() + dayOffset);
			end.setUTCHours(Math.floor(spec.endHour), (spec.endHour % 1) * 60, 0, 0);
			await prisma.scheduleBreak.create({
				data: {
					title: `${SEED_PREFIX}${spec.title}`,
					startAt: start,
					endAt: end,
				},
			});
		}
	}
}

async function main() {
	const args = process.argv.slice(2);
	const doClean = args.includes("--clean");
	const withSessions = args.includes("--with-sessions");

	// Use a fixed seed so reruns produce the same names (easier debugging).
	faker.seed(42);

	await clean();

	if (doClean) {
		console.log("Done (clean only).");
		return;
	}

	const authorIds = await seedAuthors();
	await seedSubmissions(authorIds);
	const roomIds = await seedRooms();
	const trackIds = await seedProgramTracks();

	if (withSessions) {
		await seedSessionsAndBreaks(roomIds, trackIds, authorIds);
	}

	console.log("Done.");
}

main()
	.catch((err) => {
		console.error(err);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
