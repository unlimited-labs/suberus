/**
 * Seed three demo submissions (text-only, DOCX, PDF) into the DEV database, each
 * with TWO versions (original + "corrections"), a fake completed round-1 review,
 * and a pending round-2 assignment — so the version-diff feature can be tested
 * live. Run with:  pnpm dotenv -e .env -- tsx scripts/seed-diff-demo.ts
 * (or:  pnpm tsx scripts/seed-diff-demo.ts  if env is already loaded)
 *
 * The reviewer for every submission is admin@suberus.app, so a single admin
 * login can test BOTH surfaces:
 *   - admin Submission detail → Diff tab
 *   - /reviews → open the pending round-2 assignment → "Changes since previous version"
 *
 * Re-running first removes any previously-seeded "[DIFF DEMO]" submissions.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { prisma } from "@/shared/server/db.server";
import {
	deleteFile,
	generateSubmissionFileKey,
	uploadFile,
} from "@/shared/server/storage";
import {
	AssignmentStatus,
	ReviewDecision,
	SubmissionStatus,
	SubmissionType,
} from "@/generated/prisma/enums";

const TITLE_PREFIX = "[DIFF DEMO]";
const DEMO_DIR = resolve(process.cwd(), "mf2024-demo");
const DOCX_MIME =
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const PDF_MIME = "application/pdf";

interface VersionSpec {
	title: string;
	content: string;
	comment?: string;
	/** demo file in mf2024-demo/ to attach, with a friendly name + mime */
	file?: { demo: string; name: string; mime: string };
}

interface SubmissionSpec {
	key: string;
	type: SubmissionType;
	keywords: string[];
	reviewDecision: ReviewDecision;
	reviewComments: string;
	v1: VersionSpec;
	v2: VersionSpec;
}

const SPECS: SubmissionSpec[] = [
	{
		key: "TEXT",
		type: SubmissionType.ABSTRACT,
		keywords: ["nucleation", "solidification", "machine-learning"],
		reviewDecision: ReviewDecision.ACCEPT_WITH_MINOR_REVISIONS,
		reviewComments:
			"Solid contribution. Please reword the opening claim, justify the cooling-rate choice, and add a validation set before camera-ready.",
		v1: {
			title: `${TITLE_PREFIX} Text-only — Nucleation in rapid solidification`,
			content:
				"This work presents an approach to predicting nucleation points in rapid solidification. " +
				"We train a transformer on 29 cooling-rate targets sampled between 0.5 and 45 C/s. " +
				"The method reaches an accuracy of 82% on the held-out set. " +
				"We conclude that the model generalises across the studied alloy family.",
		},
		v2: {
			title: `${TITLE_PREFIX} Text-only — Nucleation in rapid solidification (revised)`,
			content:
				"This work proposes a novel approach to predicting nucleation points in rapid solidification. " +
				"To address the reviewers' concern, we now justify the range and train a transformer on 29 cooling-rate targets sampled between 0.5 and 30 C/s. " +
				"On a newly added validation set, the method reaches an accuracy of 88% on the held-out set. " +
				"We conclude that the model generalises across the studied alloy family and transfers to two unseen alloys.",
			comment:
				"Reworded the opening, narrowed the cooling-rate range to 0.5–30 C/s, added a validation set, and reported transfer to unseen alloys.",
		},
	},
	{
		key: "DOCX",
		type: SubmissionType.FULL_PAPER,
		keywords: ["microstructure", "EBSD", "grain-growth"],
		reviewDecision: ReviewDecision.REVISE_AND_RESUBMIT,
		reviewComments:
			"The methodology needs more detail and Figure 3 is unreadable. Please expand the EBSD section and resubmit a clean manuscript.",
		v1: {
			title: `${TITLE_PREFIX} DOCX — Grain growth under cyclic loading`,
			content:
				"We study grain growth in a titanium alloy under cyclic thermal loading using EBSD. " +
				"Preliminary results suggest a 12% increase in mean grain size after 100 cycles.",
			file: {
				demo: "42cce4bbc14611a63ab87cb650b3b3f5.docx",
				name: "grain-growth-v1.docx",
				mime: DOCX_MIME,
			},
		},
		v2: {
			title: `${TITLE_PREFIX} DOCX — Grain growth under cyclic loading`,
			content:
				"We study grain growth in a titanium alloy under cyclic thermal loading using EBSD with an expanded methodology section. " +
				"Results show a 15% increase in mean grain size after 100 cycles, with a redrawn Figure 3 and per-cycle statistics.",
			comment:
				"Expanded the EBSD methodology, redrew Figure 3, and corrected the grain-size figure to 15%. Re-uploaded the full manuscript.",
			file: {
				demo: "6af48b29179fe1fe0d3982344c41dbd0.docx",
				name: "grain-growth-v2.docx",
				mime: DOCX_MIME,
			},
		},
	},
	{
		key: "PDF",
		type: SubmissionType.FULL_PAPER,
		keywords: ["thin-films", "deposition", "XRD"],
		reviewDecision: ReviewDecision.REVISE_AND_RESUBMIT,
		reviewComments:
			"Interesting results but the XRD peaks are under-discussed and the abstract overstates the conclusions. Please revise.",
		v1: {
			title: `${TITLE_PREFIX} PDF — Sputtered thin-film stress analysis`,
			content:
				"This paper analyses residual stress in sputtered thin films via XRD. " +
				"We report a compressive stress of 1.2 GPa and claim a universal scaling law.",
			file: {
				demo: "00e9d587aedc02ce5fd734b438a3e08d.pdf",
				name: "thin-film-v1.pdf",
				mime: PDF_MIME,
			},
		},
		v2: {
			title: `${TITLE_PREFIX} PDF — Sputtered thin-film stress analysis`,
			content:
				"This paper analyses residual stress in sputtered thin films via XRD, with an expanded discussion of the (111) and (200) peaks. " +
				"We report a compressive stress of 1.4 GPa and now frame the scaling law as alloy-specific rather than universal.",
			comment:
				"Expanded the XRD peak discussion, corrected the stress to 1.4 GPa, and softened the scaling-law claim. Resubmitted the revised PDF.",
			file: {
				demo: "0b2045b555e89dc9777d80f990b0737c.pdf",
				name: "thin-film-v2.pdf",
				mime: PDF_MIME,
			},
		},
	},
];

async function purgeSubmission(id: string): Promise<void> {
	const reviews = await prisma.review.findMany({
		where: { submissionId: id },
		select: { id: true },
	});
	const reviewIds = reviews.map((r) => r.id);

	const files = await prisma.file.findMany({
		where: {
			OR: [
				{ entityId: id },
				{ entityType: "REVIEW", entityId: { in: reviewIds } },
			],
		},
		select: { id: true, storageKey: true },
	});
	await Promise.all(files.map((f) => deleteFile(f.storageKey).catch(() => {})));

	await prisma.submission.update({
		where: { id },
		data: { currentVersionId: null, presenterId: null },
	});
	await prisma.review.deleteMany({ where: { submissionId: id } });
	await prisma.reviewAssignment.deleteMany({ where: { submissionId: id } });
	await prisma.editorDecision.deleteMany({ where: { submissionId: id } });
	await prisma.activityLog.deleteMany({ where: { submissionId: id } });
	await prisma.submissionKeyword.deleteMany({ where: { submissionId: id } });
	await prisma.submissionAuthor.deleteMany({ where: { submissionId: id } });
	await prisma.submissionVersion.updateMany({
		where: { submissionId: id },
		data: { fileId: null },
	});
	await prisma.file.deleteMany({
		where: { id: { in: files.map((f) => f.id) } },
	});
	await prisma.submissionVersion.deleteMany({ where: { submissionId: id } });
	await prisma.submission.delete({ where: { id } });
}

async function removePreviousDemo(): Promise<void> {
	const subs = await prisma.submission.findMany({
		where: { title: { startsWith: TITLE_PREFIX } },
		select: { id: true },
	});
	for (const { id } of subs) await purgeSubmission(id);
	if (subs.length > 0) {
		console.log(`Removed ${subs.length} previous "[DIFF DEMO]" submission(s).`);
	}
}

async function uploadVersionFile(
	submissionId: string,
	versionNumber: number,
	uploadedById: string,
	file: NonNullable<VersionSpec["file"]>,
): Promise<string> {
	const buffer = readFileSync(resolve(DEMO_DIR, file.demo));
	const storageKey = generateSubmissionFileKey(
		submissionId,
		versionNumber,
		file.name,
	);
	await uploadFile(buffer, storageKey, file.mime);
	const row = await prisma.file.create({
		data: {
			entityType: "SUBMISSION_VERSION",
			entityId: submissionId,
			type: "SUBMISSION_MAIN",
			storageKey,
			fileName: file.name,
			originalName: file.name,
			mimeType: file.mime,
			size: buffer.length,
			uploadedById,
		},
	});
	return row.id;
}

async function createVersion(
	submissionId: string,
	versionNumber: number,
	ver: VersionSpec,
	authorId: string,
) {
	const fileId = ver.file
		? await uploadVersionFile(submissionId, versionNumber, authorId, ver.file)
		: null;
	return prisma.submissionVersion.create({
		data: {
			submissionId,
			version: versionNumber,
			title: ver.title,
			content: ver.content,
			comment: ver.comment ?? null,
			fileId,
		},
	});
}

async function attachKeywords(submissionId: string, keywords: string[]) {
	for (const name of keywords) {
		const kw = await prisma.keyword.upsert({
			where: { name },
			update: {},
			create: { name },
		});
		await prisma.submissionKeyword.create({
			data: { submissionId, keywordId: kw.id },
		});
	}
}

async function seedOne(
	spec: SubmissionSpec,
	authorId: string,
	authorName: { firstName: string; lastName: string; email: string },
	reviewerId: string,
): Promise<string> {
	const submission = await prisma.submission.create({
		data: {
			userId: authorId,
			type: spec.type,
			title: spec.v2.title,
			content: spec.v2.content,
			status: SubmissionStatus.UNDER_REVIEW,
			currentRound: 2,
		},
	});

	const affiliation = await prisma.affiliation.upsert({
		where: { name: "Demo Institute of Materials" },
		update: {},
		create: { name: "Demo Institute of Materials" },
	});
	const author = await prisma.submissionAuthor.create({
		data: {
			submissionId: submission.id,
			email: authorName.email,
			firstName: authorName.firstName,
			lastName: authorName.lastName,
			affiliationId: affiliation.id,
			orderIndex: 1,
			isPresenter: true,
			userId: authorId,
		},
	});
	await prisma.submission.update({
		where: { id: submission.id },
		data: { presenterId: author.id },
	});

	await attachKeywords(submission.id, spec.keywords);

	await createVersion(submission.id, 1, spec.v1, authorId);

	// Fake completed round-1 review.
	const a1 = await prisma.reviewAssignment.create({
		data: {
			submissionId: submission.id,
			reviewerId,
			round: 1,
			status: AssignmentStatus.COMPLETED,
			deadline: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
			assignedBy: reviewerId,
			startedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
			completedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
			orderIndex: 0,
		},
	});
	await prisma.review.create({
		data: {
			assignmentId: a1.id,
			submissionId: submission.id,
			reviewerId,
			round: 1,
			decision: spec.reviewDecision,
			comments: spec.reviewComments,
			privateNotes: "Author seems responsive; minor stats issues to verify on resubmission.",
			scores: { Originality: 4, Clarity: 3, Significance: 4, Methodology: 3 },
			confidenceLevel: 4,
		},
	});

	const v2 = await createVersion(submission.id, 2, spec.v2, authorId);
	await prisma.submission.update({
		where: { id: submission.id },
		data: { currentVersionId: v2.id },
	});

	// Pending round-2 assignment so the reviewer can review the revision (diff panel).
	await prisma.reviewAssignment.create({
		data: {
			submissionId: submission.id,
			reviewerId,
			round: 2,
			status: AssignmentStatus.PENDING,
			deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
			assignedBy: reviewerId,
			orderIndex: 0,
		},
	});

	return submission.id;
}

type AuthorRow = {
	id: string;
	firstName: string | null;
	lastName: string | null;
	email: string;
};

function authorName(a: AuthorRow) {
	return {
		firstName: a.firstName ?? "Demo",
		lastName: a.lastName ?? "Author",
		email: a.email,
	};
}

async function main() {
	const reviewer = await prisma.user.findUnique({
		where: { email: "admin@suberus.app" },
		select: { id: true },
	});
	if (!reviewer) throw new Error("admin@suberus.app not found in dev DB.");

	const authors = await prisma.user.findMany({
		where: { role: "AUTHOR" },
		select: { id: true, firstName: true, lastName: true, email: true },
		take: SPECS.length,
		orderBy: { email: "asc" },
	});
	if (authors.length < SPECS.length) {
		throw new Error(`Need ${SPECS.length} AUTHOR users, found ${authors.length}.`);
	}

	await removePreviousDemo();

	for (let i = 0; i < SPECS.length; i++) {
		const a = authors[i];
		const id = await seedOne(SPECS[i], a.id, authorName(a), reviewer.id);
		console.log(`✓ ${SPECS[i].key.padEnd(5)} → /admin/submissions/${id}`);
	}

	console.log("\nDone. Log in as admin@suberus.app to test:");
	console.log("  • Compare page: open a submission → 'Compare versions' (next to the version selector)");
	console.log("  • Reviewer diff: /reviews → open the pending assignment → 'Changes since previous version'");

	await prisma.$disconnect();
}

main().catch(async (err) => {
	console.error(err);
	await prisma.$disconnect();
	process.exit(1);
});
