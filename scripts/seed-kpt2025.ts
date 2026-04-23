/**
 * Real conference data seeder (KPT 2025 demo set).
 *
 * Populates the database with real scientific abstracts from kpt2025-demo/2025/:
 *   - extracts title/body from each PDF via pdftotext
 *   - creates one author user per PDF (deterministic emails)
 *   - uploads the PDF to Garage S3
 *   - creates Submission + SubmissionVersion + File records
 *   - status=ACCEPTED, type=ABSTRACT — ready for auto-planning
 *   - scaffolds 3 rooms and empty sessions (for "fill existing" flow) unless --no-sessions
 *   - sets CONFERENCE_DATE_START/END app settings
 *
 * Usage:
 *   pnpm tsx scripts/seed-kpt2025.ts              # full seed
 *   pnpm tsx scripts/seed-kpt2025.ts --no-sessions
 *   pnpm tsx scripts/seed-kpt2025.ts --clean      # wipe only kpt2025 data
 *   pnpm tsx scripts/seed-kpt2025.ts --limit 10   # only first 10 PDFs (faster tests)
 *
 * Idempotent: reruns remove prior kpt2025 seed before inserting new rows.
 *   - users:       email "kpt2025-author-<n>@example.local"
 *   - files:       storageKey starts with "kpt2025/"
 *   - rooms:       name prefix "KPT2025 · "
 *   - sessions:    title prefix "KPT2025 · "
 */

import "dotenv/config";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { prisma } from "@/db.server";
import {
	deleteFile,
	generateSubmissionFileKey,
	uploadFile,
} from "@/lib/server/storage";

const execFileAsync = promisify(execFile);

const DEMO_DIR = path.resolve("kpt2025-demo/2025");
const SEED_USER_PREFIX = "kpt2025-author-";
const SEED_USER_RE = /^kpt2025-author-\d+@example\.local$/;
const SEED_ROOM_PREFIX = "KPT2025 · ";
const SEED_STORAGE_PREFIX = "kpt2025/";

const CONFERENCE_START = "2025-09-08";
const CONFERENCE_END = "2025-09-10";

const ROOM_NAMES = ["Aula A", "Aula B", "Aula C"];
const SESSION_SLOTS = [
	{ dayOffset: 0, startHour: 9, endHour: 10.5 },
	{ dayOffset: 0, startHour: 11, endHour: 12.5 },
	{ dayOffset: 0, startHour: 14, endHour: 15.5 },
	{ dayOffset: 0, startHour: 16, endHour: 17.5 },
	{ dayOffset: 1, startHour: 9, endHour: 10.5 },
	{ dayOffset: 1, startHour: 11, endHour: 12.5 },
	{ dayOffset: 1, startHour: 14, endHour: 15.5 },
	{ dayOffset: 1, startHour: 16, endHour: 17.5 },
];

interface ParsedDoc {
	file: string;
	title: string;
	body: string;
	buffer: Buffer;
}

async function pdfToText(filePath: string): Promise<string> {
	const { stdout } = await execFileAsync("pdftotext", ["-layout", filePath, "-"]);
	return stdout;
}

function parseTitleAndBody(text: string): { title: string; body: string } {
	const lines = text
		.split(/\r?\n/)
		.map((l) => l.trim())
		.filter((l) => l.length > 0);
	const title = (lines[0] ?? "(no title)").slice(0, 280);
	const body = lines.slice(1).join("\n").trim();
	return { title, body };
}

async function loadDocs(limit: number | null): Promise<ParsedDoc[]> {
	const files = (await fs.readdir(DEMO_DIR))
		.filter((f) => f.toLowerCase().endsWith(".pdf"))
		.sort();
	const capped = limit ? files.slice(0, limit) : files;

	const docs: ParsedDoc[] = [];
	for (const f of capped) {
		const full = path.join(DEMO_DIR, f);
		const buffer = await fs.readFile(full);
		try {
			const text = await pdfToText(full);
			const { title, body } = parseTitleAndBody(text);
			if (!body || body.length < 100) {
				console.warn(`[skip] ${f}: body too short (${body.length} chars)`);
				continue;
			}
			docs.push({ file: f, title, body, buffer });
			console.log(`[parse] ${f} — "${title.slice(0, 60)}"`);
		} catch (e) {
			console.warn(`[skip] pdftotext failed for ${f}: ${(e as Error).message}`);
		}
	}
	return docs;
}

async function clean(): Promise<void> {
	console.log("Cleaning previously seeded KPT2025 data…");

	const seedUsers = await prisma.user.findMany({
		where: { email: { startsWith: SEED_USER_PREFIX } },
		select: { id: true, email: true },
	});
	const seedUserIds = seedUsers
		.filter((u) => SEED_USER_RE.test(u.email))
		.map((u) => u.id);

	const seedSubmissions = await prisma.submission.findMany({
		where: { userId: { in: seedUserIds } },
		select: { id: true },
	});
	const seedSubmissionIds = seedSubmissions.map((s) => s.id);

	// Collect file storage keys to delete from S3 after DB cleanup.
	const seedFiles = await prisma.file.findMany({
		where: { storageKey: { startsWith: SEED_STORAGE_PREFIX } },
		select: { id: true, storageKey: true },
	});
	const fileIds = seedFiles.map((f) => f.id);

	await prisma.$transaction(async (tx) => {
		await tx.presentationSlot.deleteMany({
			where: { submissionId: { in: seedSubmissionIds } },
		});
		await tx.programSession.deleteMany({
			where: { title: { startsWith: SEED_ROOM_PREFIX } },
		});
		await tx.room.deleteMany({
			where: { name: { startsWith: SEED_ROOM_PREFIX } },
		});
		await tx.submissionEmbedding.deleteMany({
			where: { submissionId: { in: seedSubmissionIds } },
		});
		await tx.submissionAuthor.deleteMany({
			where: { submissionId: { in: seedSubmissionIds } },
		});
		await tx.submissionKeyword.deleteMany({
			where: { submissionId: { in: seedSubmissionIds } },
		});
		await tx.submission.updateMany({
			where: { id: { in: seedSubmissionIds } },
			data: { currentVersionId: null, presenterId: null },
		});
		await tx.submissionVersion.deleteMany({
			where: { submissionId: { in: seedSubmissionIds } },
		});
		await tx.submission.deleteMany({ where: { id: { in: seedSubmissionIds } } });
		await tx.file.deleteMany({ where: { id: { in: fileIds } } });
		await tx.user.deleteMany({ where: { id: { in: seedUserIds } } });
	});

	for (const f of seedFiles) {
		try {
			await deleteFile(f.storageKey);
		} catch (e) {
			console.warn(`  [s3] could not delete ${f.storageKey}: ${(e as Error).message}`);
		}
	}

	console.log(
		`  removed: ${seedUserIds.length} users, ${seedSubmissionIds.length} submissions, ${seedFiles.length} files`,
	);
}

async function setConferenceDates(): Promise<void> {
	for (const [key, value] of [
		["CONFERENCE_DATE_START", CONFERENCE_START],
		["CONFERENCE_DATE_END", CONFERENCE_END],
	] as const) {
		await prisma.appSetting.upsert({
			where: { key },
			update: { value },
			create: { key, value },
		});
	}
	console.log(`Conference dates: ${CONFERENCE_START} — ${CONFERENCE_END}`);
}

async function seedSubmissionFromDoc(doc: ParsedDoc, index: number): Promise<void> {
	// Derive an author name from the filename for display; real extraction from
	// the PDF body is unreliable (authors are typically below the title), so we
	// pick deterministic placeholders.
	const firstName = "KPT";
	const lastName = `Author ${String(index + 1).padStart(2, "0")}`;
	const email = `${SEED_USER_PREFIX}${index + 1}@example.local`;

	const user = await prisma.user.create({
		data: {
			email,
			firstName,
			lastName,
			emailVerified: true,
			role: "AUTHOR",
		},
		select: { id: true },
	});

	const submission = await prisma.submission.create({
		data: {
			type: "ABSTRACT",
			title: doc.title,
			content: doc.body,
			status: "ACCEPTED",
			userId: user.id,
			authors: {
				create: [
					{
						firstName,
						lastName,
						email,
						orderIndex: 0,
						isPresenter: true,
						userId: user.id,
					},
				],
			},
		},
		select: { id: true },
	});

	const storageKey = generateSubmissionFileKey(submission.id, 1, doc.file).replace(
		/^submissions\//,
		SEED_STORAGE_PREFIX,
	);
	await uploadFile(doc.buffer, storageKey, "application/pdf");

	const file = await prisma.file.create({
		data: {
			entityType: "SUBMISSION_VERSION",
			entityId: submission.id,
			type: "SUBMISSION_MAIN",
			storageKey,
			fileName: doc.file,
			originalName: doc.file,
			mimeType: "application/pdf",
			size: doc.buffer.byteLength,
			uploadedById: user.id,
		},
		select: { id: true },
	});

	const version = await prisma.submissionVersion.create({
		data: {
			submissionId: submission.id,
			version: 1,
			title: doc.title,
			content: doc.body,
			fileId: file.id,
		},
		select: { id: true },
	});

	const presenter = await prisma.submissionAuthor.findFirst({
		where: { submissionId: submission.id, isPresenter: true },
		select: { id: true },
	});

	await prisma.submission.update({
		where: { id: submission.id },
		data: {
			currentVersionId: version.id,
			presenterId: presenter?.id,
		},
	});
}

async function seedRooms(): Promise<string[]> {
	console.log(`Seeding ${ROOM_NAMES.length} rooms…`);
	const ids: string[] = [];
	for (let i = 0; i < ROOM_NAMES.length; i++) {
		const r = await prisma.room.create({
			data: { name: `${SEED_ROOM_PREFIX}${ROOM_NAMES[i]}`, order: i },
			select: { id: true },
		});
		ids.push(r.id);
	}
	return ids;
}

async function seedEmptySessions(roomIds: string[]): Promise<void> {
	console.log(`Seeding ${SESSION_SLOTS.length * roomIds.length} empty sessions…`);
	const base = new Date(`${CONFERENCE_START}T00:00:00Z`);
	let counter = 1;
	for (const slot of SESSION_SLOTS) {
		for (const roomId of roomIds) {
			const start = new Date(base);
			start.setUTCDate(start.getUTCDate() + slot.dayOffset);
			start.setUTCHours(
				Math.floor(slot.startHour),
				(slot.startHour % 1) * 60,
				0,
				0,
			);
			const end = new Date(base);
			end.setUTCDate(end.getUTCDate() + slot.dayOffset);
			end.setUTCHours(
				Math.floor(slot.endHour),
				(slot.endHour % 1) * 60,
				0,
				0,
			);
			await prisma.programSession.create({
				data: {
					title: `${SEED_ROOM_PREFIX}Session ${counter}`,
					startAt: start,
					endAt: end,
					roomId,
				},
			});
			counter++;
		}
	}
}

async function main() {
	const args = process.argv.slice(2);
	const doClean = args.includes("--clean");
	const noSessions = args.includes("--no-sessions");
	const limitIdx = args.indexOf("--limit");
	const limit =
		limitIdx >= 0 ? Number.parseInt(args[limitIdx + 1] ?? "", 10) || null : null;

	await clean();
	if (doClean) {
		console.log("Done (clean only).");
		return;
	}

	console.log(`Loading PDFs from ${DEMO_DIR}${limit ? ` (limit ${limit})` : ""}…`);
	const docs = await loadDocs(limit);
	if (docs.length === 0) throw new Error("No PDFs parsed — aborting");
	console.log(`  parsed ${docs.length} PDFs`);

	await setConferenceDates();

	console.log(`Seeding ${docs.length} users + submissions + S3 uploads…`);
	for (let i = 0; i < docs.length; i++) {
		await seedSubmissionFromDoc(docs[i], i);
		if ((i + 1) % 10 === 0 || i === docs.length - 1) {
			console.log(`  ${i + 1}/${docs.length}`);
		}
	}

	const roomIds = await seedRooms();
	if (!noSessions) {
		await seedEmptySessions(roomIds);
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
