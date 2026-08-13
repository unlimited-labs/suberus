/**
 * Documentation screenshot capture — NOT a test suite.
 *
 * Generates the screenshots listed in docs/SCREENSHOTS.md into
 * docs/src/assets/screenshots/. Skipped entirely unless DOCS_SHOTS=1:
 *
 *   E2E_WORKERS=1 DOCS_SHOTS=1 pnpm exec playwright test --project=screenshots
 *
 * Shot 03 (installer) needs a separate empty-DB server; set DOCS_INSTALL_URL
 * (e.g. http://127.0.0.1:3055) to a running instance with zero users.
 */
import { createUploadToken } from "@/features/submissions/server/upload-token";
import { test, expect } from "../helpers/base-fixtures";
import {
	createFee,
	createAssignmentWithDeadline,
	createSubmission,
	createSubmissionWithAssignment,
	createSubmissionWithDecision,
	createSubmissionWithFile,
	createSubmissionWithReview,
	createTestUser,
	ensureSeededSurveyQuestions,
	getPrisma,
	getTestUserIds,
	setAppSetting,
	setConferenceDates,
	setConferenceTimezone,
	setDailyBusinessHours,
	setSchedulePublished,
} from "../helpers/test-db";
import { runSubmissionAction } from "../helpers/submission-actions";
import { DEFAULT_EXHIBITOR_CONFIG } from "../../src/features/settings/defaults";
import {
	AssignmentStatus,
	EditorDecisionType,
	ExhibitorStatus,
	InvitationStatus,
	SubmissionStatus,
	SubmissionType,
	UserRole,
} from "../../src/generated/prisma/enums";
import { randomUUID } from "crypto";
import * as path from "path";
import * as fs from "fs";
import type { Page } from "@playwright/test";
import AdmZip from "adm-zip";

const DOCS_PDF = Buffer.from(
	"%PDF-1.4\n% docs screenshot fixture\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n",
);

const SHOTS_DIR = path.resolve("docs/src/assets/screenshots");

const day = (d: number, time: string) => new Date(`2026-09-${String(d).padStart(2, "0")}T${time}:00.000Z`);

/** A service is "up" if it answers at all (any HTTP status, not a network error). */
async function serviceUp(url: string | undefined): Promise<boolean> {
	if (!url) return false;
	try {
		await fetch(url, { signal: AbortSignal.timeout(4000) });
		return true;
	} catch {
		return false;
	}
}

/**
 * Capture the viewport at 1440×`height` (default 900). Settings/dashboard pages
 * scroll inside an internal container, so fullPage can't reach below the fold —
 * a taller viewport is the reliable way to get the whole tab on one image.
 * `full: true` uses a real fullPage shot (pages that scroll at body level).
 */
async function shot(page: Page, name: string, opts?: { full?: boolean; height?: number }) {
	const height = opts?.height ?? 900;
	if (height !== 900) {
		await page.setViewportSize({ width: 1440, height });
		await page.waitForTimeout(600);
	}
	await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
	await page.waitForTimeout(500);
	if (height !== 900) {
		// The tall viewport is only a measuring canvas — clip to where content
		// actually ends so screenshots carry no dead whitespace. Leaf elements
		// only: full-height flex containers (and the dev build footer pinned to
		// their bottom) would otherwise report the whole viewport as content.
		const bottom = await page.evaluate(() => {
			const root = document.querySelector("main") ?? document.body;
			let max = 0;
			for (const el of Array.from(root.querySelectorAll("*"))) {
				if (el.children.length > 0) continue;
				const text = (el.textContent ?? "").trim();
				const isMedia = ["IMG", "SVG", "CANVAS", "INPUT", "BUTTON", "SELECT", "TEXTAREA"].includes(el.tagName.toUpperCase());
				if (!text && !isMedia) continue;
				if (/^build\b/i.test(text)) continue;
				const r = el.getBoundingClientRect();
				if (r.width <= 0 || r.height <= 0) continue;
				if (r.bottom > max) max = r.bottom;
			}
			return Math.ceil(max);
		});
		const clipHeight = Math.min(height, Math.max(900, bottom + 32));
		await page.screenshot({
			path: path.join(SHOTS_DIR, name),
			clip: { x: 0, y: 0, width: 1440, height: clipHeight },
		});
		await page.setViewportSize({ width: 1440, height: 900 });
		await page.waitForTimeout(300);
		return;
	}
	await page.screenshot({ path: path.join(SHOTS_DIR, name), fullPage: opts?.full ?? false });
}

// Shared ids filled by beforeAll
const ctx = {
	multiVersionId: "",
	submittedId: "",
	decidedId: "",
	docxId: "",
	profileUserId: "",
	exhibitorPendingId: "",
	reviewerAssignmentId: "",
	eventBreakId: "",
};

/**
 * Idempotently seed the exhibitor feature + a reviewer assignment used by the
 * Part 4 shots. Kept separate from the main arrangement so it self-heals on a DB
 * seeded by an older version of this script (where these rows wouldn't exist).
 */
async function ensureDocsExtras(adminUserId: string, reviewerUserId: string) {
	const db = getPrisma();
	await setAppSetting("SUBMISSION_TYPE_EXHIBITOR", {
		...DEFAULT_EXHIBITOR_CONFIG,
		isActive: true,
		allowExhibitorPresentation: true,
		includeInPlanner: true,
	});
	const exhibitorPeople: Array<[string, string, string, string, string, ExhibitorStatus, string | null]> = [
		["NanoFab Solutions", "https://nanofab.example.com", "Hannah", "Berg", "Cleanroom tooling and precision nanofabrication services for materials research.", ExhibitorStatus.PENDING, null],
		["Helmholtz Instruments", "https://hzi-instruments.example.com", "Marco", "Conti", "Electron microscopy and in-situ characterisation instruments.", ExhibitorStatus.APPROVED, "Gold"],
		["Quantum Optics Ltd", "https://quantum-optics.example.com", "Priya", "Nair", "Lasers and photonics for spectroscopy and additive manufacturing.", ExhibitorStatus.PENDING, null],
	];
	for (const [company, website, firstName, lastName, description, status, pkg] of exhibitorPeople) {
		if (await db.exhibitor.findFirst({ where: { companyName: company } })) continue;
		const u = await createTestUser({
			email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@exhibitor.example.org`,
			firstName,
			lastName,
			affiliationName: company,
			role: UserRole.EXHIBITOR,
		});
		await db.exhibitor.create({
			data: {
				userId: u.id,
				companyName: company,
				website,
				description,
				package: pkg,
				status,
				appliedAt: day(12, "10:00"),
				...(status === ExhibitorStatus.APPROVED
					? { decidedAt: day(13, "09:00"), decidedById: adminUserId }
					: {}),
			},
		});
	}

	// Reviewer can open the version-compare page only with an assignment on the
	// multi-version paper — seed one for the reviewer service account.
	const mv = await db.submission.findFirst({
		where: { title: "Coupled CFD-FEM Model of Laser Powder Bed Fusion" },
	});
	if (mv && !(await db.reviewAssignment.findFirst({ where: { submissionId: mv.id, reviewerId: reviewerUserId } }))) {
		await db.reviewAssignment.create({
			data: {
				submissionId: mv.id,
				reviewerId: reviewerUserId,
				round: 1,
				status: AssignmentStatus.COMPLETED,
				deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
				assignedBy: adminUserId,
				startedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
				completedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
				orderIndex: 0,
			},
		});
	}
}

/**
 * Idempotently seed document templates + a spread of generated documents
 * (READY/PENDING/FAILED, incl. some for the e2e "user" account so the
 * participant My Documents shot is populated). DB-only — no real rendering.
 */
async function ensureDocsDocuments(adminUserId: string, testUserId: string) {
	const db = getPrisma();
	const upsertTemplate = async (
		name: string,
		description: string | null,
		placeholders: string[],
		originalName: string,
		size: number,
	) => {
		const existing = await db.documentTemplate.findFirst({ where: { name } });
		if (existing) return existing;
		return db.documentTemplate.create({
			data: {
				name,
				description,
				storageKey: `documents/templates/docs-${name.replace(/\W+/g, "-").toLowerCase()}/${originalName}`,
				originalName,
				size,
				placeholders,
				createdById: adminUserId,
			},
		});
	};

	const visa = await upsertTemplate(
		"Visa invitation letter",
		"Official invitation for participants applying for an entry visa.",
		["firstName", "lastName", "affiliation", "abstractTitle", "date"],
		"visa-invitation.docx",
		8540,
	);
	const cert = await upsertTemplate(
		"Certificate of participation",
		null,
		["firstName", "lastName", "date"],
		"certificate.docx",
		8575,
	);

	if ((await db.generatedDocument.count()) > 0) return;

	const byEmail = (email: string) =>
		db.user.findUnique({ where: { email } });
	const sofia = await byEmail("sofia.rossi@example.org");
	const lukas = await byEmail("lukas.weber@example.org");
	const kenji = await byEmail("kenji.tanaka@example.org");

	const rows: Array<{
		userId: string;
		templateId: string;
		name: string;
		status: "READY" | "PENDING" | "FAILED";
		storageKey?: string;
		size?: number;
		error?: string;
	}> = [
		{ userId: testUserId, templateId: cert.id, name: "Certificate of participation", status: "READY", storageKey: "documents/generated/docs-1.pdf", size: 18234 },
		{ userId: testUserId, templateId: visa.id, name: "Visa invitation letter", status: "READY", storageKey: "documents/generated/docs-2.pdf", size: 21002 },
	];
	if (sofia) rows.push({ userId: sofia.id, templateId: visa.id, name: "Visa invitation letter", status: "READY", storageKey: "documents/generated/docs-3.pdf", size: 20891 });
	if (lukas) rows.push({ userId: lukas.id, templateId: cert.id, name: "Certificate of participation", status: "PENDING" });
	if (kenji) rows.push({ userId: kenji.id, templateId: visa.id, name: "Visa invitation letter", status: "FAILED", error: "LibreOffice timed out converting the document" });

	await db.generatedDocument.createMany({
		data: rows.map((r) => ({ ...r, generatedById: adminUserId })),
	});
}

/**
 * Idempotently give the "Crystal Plasticity FEM" submission a camera-ready
 * PDF + an admin favourite on its slot (feeds the camera-ready card, the
 * public preview dialog's download button, and the favourited-star state),
 * and seed a published "Event" schedule item (featured card on /program).
 */
async function ensureDocsScreenshotExtras(adminUserId: string) {
	const db = getPrisma();
	const decided = await db.submission.findFirstOrThrow({
		where: { title: "Crystal Plasticity FEM of Ti-6Al-4V Lattice Structures" },
	});
	if (!decided.cameraReadyFileId) {
		const { setCameraReady } = await import(
			"../../src/features/submissions/server/camera-ready"
		);
		const result = await setCameraReady(
			decided.id,
			DOCS_PDF,
			"camera-ready.pdf",
			adminUserId,
		);
		if (!result.ok) throw new Error(`camera-ready seed failed: ${result.error}`);
	}
	const slot = await db.presentationSlot.findFirstOrThrow({
		where: { submissionId: decided.id },
	});
	const favorite = await db.presentationFavorite.findFirst({
		where: { slotId: slot.id, userId: adminUserId },
	});
	if (!favorite) {
		await db.presentationFavorite.create({
			data: { slotId: slot.id, userId: adminUserId },
		});
	}

	const dinner = await db.scheduleBreak.findFirst({
		where: { title: "Conference Dinner", kind: "EVENT" },
	});
	ctx.eventBreakId =
		dinner?.id ??
		(
			await db.scheduleBreak.create({
				data: {
					title: "Conference Dinner",
					kind: "EVENT",
					description:
						"Join us for a three-course dinner at the historic Sukiennice Hall.",
					location: "Sukiennice Hall, Krakow",
					locationUrl: "https://example.org/sukiennice",
					// Day 14 — the public program's default active day — so the
					// shot doesn't need to switch day tabs first.
					startAt: day(14, "16:00"),
					endAt: day(14, "17:00"),
				},
			})
		).id;

	await ensureSeededSurveyQuestions();
}

/** Resolve ctx ids from the DB by title (survives worker restarts). */
async function resolveCtx() {
	const db = getPrisma();
	const byTitle = async (title: string) => {
		const s = await db.submission.findFirst({ where: { title } });
		if (!s) throw new Error(`ctx submission not found: ${title}`);
		return s.id;
	};
	ctx.submittedId = await byTitle("Graph Neural Networks for Predicting Grain Boundary Mobility");
	ctx.decidedId = await byTitle("Crystal Plasticity FEM of Ti-6Al-4V Lattice Structures");
	ctx.multiVersionId = await byTitle("Coupled CFD-FEM Model of Laser Powder Bed Fusion");
	ctx.docxId = await byTitle("Microstructure-Informed Fatigue Life Prediction");
	const profileUser = await db.user.findUnique({ where: { email: "sofia.rossi@example.org" } });
	if (!profileUser) throw new Error("ctx profile user not found");
	ctx.profileUserId = profileUser.id;
	const pendingExhibitor = await db.exhibitor.findFirst({ where: { companyName: "NanoFab Solutions" } });
	if (!pendingExhibitor) throw new Error("ctx pending exhibitor not found");
	ctx.exhibitorPendingId = pendingExhibitor.id;
	const reviewerAssignment = await db.reviewAssignment.findFirst({ where: { submissionId: ctx.multiVersionId } });
	if (!reviewerAssignment) throw new Error("ctx reviewer assignment not found");
	ctx.reviewerAssignmentId = reviewerAssignment.id;
}

const MCP_CLIENT_ID = "https://assistant.example/mcp-client.json";
const MCP_CALLBACK = "http://127.0.0.1:9876/callback";

function mcpResource(page: Page) {
	return `${new URL(page.url() || "http://localhost").origin}/api/mcp`;
}

function mcpAuthorizeUrl(page: Page) {
	const params = new URLSearchParams({
		response_type: "code",
		client_id: MCP_CLIENT_ID,
		redirect_uri: MCP_CALLBACK,
		scope: "openid profile email",
		state: "docs",
		code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
		code_challenge_method: "S256",
		resource: mcpResource(page),
	});
	return `/api/auth/oauth2/authorize?${params}`;
}

/** Register an assistant so the shots show a realistic client, not an empty list. */
async function seedMcpConsent(page: Page, opts: { withConsent?: boolean } = {}) {
	const db = getPrisma();
	await page.goto("/");
	const resource = mcpResource(page);
	// The docs arrangement replaces the seeded accounts with a realistic roster,
	// so admin@e2e.local is gone by now — resolve whoever holds ADMIN instead.
	const admin = await db.user.findFirst({ where: { role: "ADMIN" } });
	if (!admin) throw new Error("no ADMIN user in the arranged docs data");

	await db.oauthConsent.deleteMany({ where: { clientId: MCP_CLIENT_ID } });
	await db.oauthClient.deleteMany({ where: { clientId: MCP_CLIENT_ID } });
	await db.oauthClient.create({
		data: {
			clientId: MCP_CLIENT_ID,
			name: "Claude Code",
			redirectUris: [MCP_CALLBACK],
			grantTypes: ["authorization_code", "refresh_token"],
			responseTypes: ["code"],
			tokenEndpointAuthMethod: "none",
			scopes: ["openid", "profile", "email", "offline_access"],
			requirePKCE: true,
		},
	});
	await db.oauthClientResource
		.create({ data: { clientId: MCP_CLIENT_ID, resourceId: resource } })
		.catch(() => undefined);

	if (opts.withConsent !== false) {
		await db.oauthConsent.create({
			data: {
				clientId: MCP_CLIENT_ID,
				userId: admin.id,
				scopes: ["openid", "profile", "email", "offline_access"],
				resources: [resource],
				createdAt: new Date(),
			},
		});
	}
}

test.describe("docs screenshots", () => {
	test.skip(!process.env.DOCS_SHOTS, "Set DOCS_SHOTS=1 to capture docs screenshots");
	test.describe.configure({ retries: 0, timeout: 90_000 });
	test.use({ viewport: { width: 1440, height: 900 } });

	test.beforeAll(async () => {
		test.setTimeout(300_000);
		fs.mkdirSync(SHOTS_DIR, { recursive: true });
		const db = getPrisma();
		const { testUserId, adminUserId, reviewerUserId, editorUserId } = await getTestUserIds();

		// Worker restarts (after any test failure) re-run beforeAll — make the
		// arrangement idempotent and resolve ctx ids from the DB at the end.
		const arranged = await db.user.findUnique({
			where: { email: "maria.kowalska@example.org" },
		});
		if (arranged) {
			await ensureDocsExtras(adminUserId, reviewerUserId);
			await ensureDocsDocuments(adminUserId, testUserId);
			await ensureDocsScreenshotExtras(adminUserId);
			await resolveCtx();
			return;
		}

		// --- conference identity & dates ---------------------------------------
		await setAppSetting("CONFERENCE_NAME", "ICCMS 2026");
		await setAppSetting("CONFERENCE_SUBTITLE", "International Conference on Computational Materials Science");
		await setAppSetting("CONFERENCE_LOCATION", "Krakow, Poland");
		await setAppSetting("CONFERENCE_WEBSITE", "https://iccms2026.example.org");
		await setAppSetting("CONTACT_EMAIL", "contact@iccms2026.example.org");
		// Native date inputs need plain yyyy-MM-dd values
		await setConferenceDates("2026-09-14", "2026-09-16");
		await setAppSetting("SUBMISSION_DEADLINE", "2026-05-31");
		await setAppSetting("REGISTRATION_DEADLINE", "2026-08-31");
		await setAppSetting("REVIEW_DEADLINE", "2026-06-30");
		await setAppSetting("NOTIFICATION_DATE", "2026-07-15");
		await setConferenceTimezone("UTC");
		await setDailyBusinessHours("08:00", "18:00");
		await setAppSetting("PLANNER_AUTOPLAN_ENABLED", true);

		// --- realistic users (distinct affiliations: createTestUser creates, not upserts)
		const people: Array<[string, string, string, UserRole, string]> = [
			["Maria", "Kowalska", "AGH University of Krakow", UserRole.REVIEWER, "PL"],
			["James", "Chen", "Massachusetts Institute of Technology", UserRole.REVIEWER, "US"],
			["Sofia", "Rossi", "Politecnico di Milano", UserRole.AUTHOR, "IT"],
			["Lukas", "Weber", "ETH Zurich", UserRole.AUTHOR, "CH"],
			["Emily", "Watson", "University of Cambridge", UserRole.EDITOR, "GB"],
			["Kenji", "Tanaka", "NIMS Tsukuba", UserRole.AUTHOR, "JP"],
			["Anna", "Nowak", "TU Delft", UserRole.AUTHOR, "NL"],
			["Pedro", "Alvarez", "UPC Barcelona", UserRole.AUTHOR, "ES"],
		];
		const userIds: string[] = [];
		for (const [firstName, lastName, affiliationName, role, country] of people) {
			const u = await createTestUser({
				email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.org`,
				firstName,
				lastName,
				affiliationName,
				role,
			});
			await db.user.update({ where: { id: u.id }, data: { country } });
			userIds.push(u.id);
		}
		// Submissions are owned by the matching realistic author (not the e2e test user)
		const authorUser = (i: number) =>
			[userIds[2], userIds[3], userIds[5], userIds[6], userIds[7]][i % 5];

		// --- survey: surface answers as users-list columns ----------------------
		const formatQ = await db.surveyQuestion.findFirst({ where: { label: "Preferred session format" } });
		if (formatQ) {
			await db.surveyQuestion.update({
				where: { id: formatQ.id },
				data: { showInUsersList: true, fieldName: "Format" },
			});
			const formats = ["Oral", "Poster", "Oral", "Workshop", "Oral"];
			for (let i = 0; i < formats.length; i++) {
				await db.surveyAnswer.create({
					data: { userId: userIds[i], questionId: formatQ.id, value: formats[i] },
				});
			}
		}
		const dietQ = await db.surveyQuestion.findFirst({ where: { label: "Dietary requirements" } });
		if (dietQ) {
			await db.surveyQuestion.update({
				where: { id: dietQ.id },
				data: { showInUsersList: true, fieldName: "Diet" },
			});
			const diets = ["Vegetarian", "None", "Gluten-free"];
			for (let i = 0; i < diets.length; i++) {
				await db.surveyAnswer.create({
					data: { userId: userIds[i], questionId: dietQ.id, value: diets[i] },
				});
			}
		}

		// --- fees ----------------------------------------------------------------
		for (const uid of [userIds[0], userIds[2], userIds[3], testUserId]) {
			await createFee({ userId: uid, type: "Regular", amount: 150, currency: "EUR" });
		}

		// --- intake tracks ---------------------------------------------------------
		const mlTrack = await db.conferenceTrack.create({
			data: { name: "Machine Learning in Materials", supervisorId: reviewerUserId, isActive: true },
		});
		await db.conferenceTrack.create({
			data: { name: "Additive Manufacturing", supervisorId: null, isActive: true },
		});
		await db.conferenceTrack.create({
			data: { name: "Multiscale Modelling", supervisorId: editorUserId, isActive: true },
		});

		// --- submissions across the workflow --------------------------------------
		const authorPool = [
			{ firstName: "Sofia", lastName: "Rossi", affiliationName: "Politecnico di Milano", email: "sofia.rossi@example.org" },
			{ firstName: "Lukas", lastName: "Weber", affiliationName: "ETH Zurich", email: "lukas.weber@example.org" },
			{ firstName: "Kenji", lastName: "Tanaka", affiliationName: "NIMS Tsukuba", email: "kenji.tanaka@example.org" },
			{ firstName: "Anna", lastName: "Nowak", affiliationName: "TU Delft", email: "anna.nowak@example.org" },
			{ firstName: "Pedro", lastName: "Alvarez", affiliationName: "UPC Barcelona", email: "pedro.alvarez@example.org" },
		];
		const author = (i: number) => authorPool[i % authorPool.length];

		await createSubmission({
			title: "Graph Neural Networks for Predicting Grain Boundary Mobility",
			status: SubmissionStatus.SUBMITTED,
			authorData: author(0),
			userId: authorUser(0),
			keywords: ["machine learning", "grain boundaries"],
			trackId: mlTrack.id,
		});
		await createSubmission({
			title: "In-situ Observation of Dendrite Growth in Al-Cu Alloys",
			status: SubmissionStatus.SUBMITTED,
			authorData: author(1),
			userId: authorUser(1),
			keywords: ["solidification", "dendrites"],
		});
		await createSubmissionWithAssignment({
			title: "Phase-Field Simulation of Rapid Solidification in L-PBF",
			authorData: author(2),
			userId: authorUser(2),
			keywords: ["phase-field", "additive manufacturing"],
		});
		await createAssignmentWithDeadline({
			title: "Bayesian Optimisation of CALPHAD Model Parameters",
			authorData: author(3),
			userId: authorUser(3),
		});
		await createSubmissionWithReview({
			title: "A Transformer Surrogate for Nucleation Kinetics in Continuous Casting",
			authorData: author(4),
			userId: authorUser(4),
			keywords: ["surrogate models", "nucleation"],
		});

		const acceptedTitles = [
			"Crystal Plasticity FEM of Ti-6Al-4V Lattice Structures",
			"High-Throughput DFT Screening of High-Entropy Alloys",
			"Digital Twin of an Industrial Heat-Treatment Line",
			"Molecular Dynamics Study of Hydrogen Embrittlement in Ferrite",
			"Uncertainty Quantification in ICME Workflows",
		];
		const acceptedIds: string[] = [];
		for (let i = 0; i < acceptedTitles.length; i++) {
			const s = await createSubmissionWithDecision({
				title: acceptedTitles[i],
				editorDecision: EditorDecisionType.ACCEPT,
				authorData: author(i),
				userId: authorUser(i),
			});
			acceptedIds.push(s.submissionId);
		}

		await createSubmissionWithDecision({
			title: "Deep Learning Segmentation of EBSD Orientation Maps",
			editorDecision: EditorDecisionType.CONDITIONALLY_ACCEPT,
			authorData: author(1),
			userId: authorUser(1),
		});
		await createSubmissionWithDecision({
			title: "A Cellular Automaton Model of Recrystallisation",
			editorDecision: EditorDecisionType.REVISE_AND_RESUBMIT,
			authorData: author(2),
			userId: authorUser(2),
		});
		await createSubmissionWithDecision({
			title: "Empirical Hardness Correlations Revisited",
			editorDecision: EditorDecisionType.REJECT,
			authorData: author(3),
			userId: authorUser(3),
		});

		// Full paper with two versions → version selector on the Content tab and,
		// crucially, the version-compare showcase. v1 → v2 changes the title,
		// content, keywords and author line-up so the side-by-side diff has a real,
		// highlighted redline to display (this is the product's headline feature).
		const mv = await createSubmissionWithFile({
			title: "Coupled CFD-FEM Model of Laser Powder Bed Fusion",
			type: SubmissionType.FULL_PAPER,
			status: SubmissionStatus.AWAITING_DECISION,
			authorData: author(4),
			userId: authorUser(4),
			content:
				"We present a coupled CFD-FEM framework for laser powder bed fusion that resolves melt-pool hydrodynamics and the surrounding thermal field on a shared mesh. The model captures Marangoni convection and recoil pressure, and predicts the as-built temperature history used for residual-stress analysis.",
			keywords: ["L-PBF", "multiphysics", "thermal modelling"],
			extraAuthors: [
				{
					firstName: "Mara",
					lastName: "Lindholm",
					affiliationName: "KTH Royal Institute of Technology",
					isPresenter: false,
				},
			],
		});
		// Evolve v1's frozen author snapshot for v2 (adds one co-author → an
		// inserted author line in the diff).
		const v1 = await db.submissionVersion.findFirstOrThrow({
			where: { submissionId: mv.id, version: 1 },
			include: { authorsSnapshot: { orderBy: { orderIndex: "asc" } } },
		});
		const v2Authors = v1.authorsSnapshot.map((a) => ({
			firstName: a.firstName,
			lastName: a.lastName,
			email: a.email,
			affiliation: a.affiliation,
			orderIndex: a.orderIndex,
			isPresenter: a.isPresenter,
		}));
		v2Authors.push({
			firstName: "Tomas",
			lastName: "Novak",
			email: `novak-${mv.id.slice(0, 8)}@test.com`,
			affiliation: "Brno University of Technology",
			orderIndex: v2Authors.length + 1,
			isPresenter: false,
		});
		const v2 = await db.submissionVersion.create({
			data: {
				submissionId: mv.id,
				version: 2,
				title:
					"Coupled CFD-FEM Model of Laser Powder Bed Fusion: A Multiphysics Study",
				content:
					"We present a coupled CFD-FEM framework for laser powder bed fusion that resolves melt-pool hydrodynamics and the surrounding thermal field on a shared mesh. The model captures Marangoni convection, recoil pressure and evaporative cooling, and predicts the as-built temperature history used for residual-stress analysis. A grid-independence study confirms the melt-pool depth is resolved to within 3%.",
				comment:
					"Revised after first-round reviews: clarified the melt-pool boundary condition, added evaporative cooling, and included a grid-independence study.",
				fileId: mv.fileId,
				authorsSnapshot: { create: v2Authors },
				keywordsSnapshot: {
					create: [
						{ name: "L-PBF" },
						{ name: "multiphysics" },
						{ name: "melt-pool dynamics" },
					],
				},
			},
		});
		await db.submission.update({ where: { id: mv.id }, data: { currentVersionId: v2.id } });

		// DOCX upload (extraction context)
		await createSubmissionWithFile({
			title: "Microstructure-Informed Fatigue Life Prediction",
			type: SubmissionType.FULL_PAPER,
			status: SubmissionStatus.SUBMITTED,
			authorData: author(0),
			userId: authorUser(0),
			fixturePath: "e2e/submissions/fixtures/extraction-sample.docx",
			fileName: "manuscript.docx",
			mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		});
		// --- program planner --------------------------------------------------------
		const aula = await db.room.create({
			data: { name: "Aula Magna", description: "Main lecture hall", order: 0 },
		});
		const r101 = await db.room.create({ data: { name: "Room 101", order: 1 } });
		const tModel = await db.programTrack.create({
			data: { name: "Modelling & Simulation", color: "#3b82f6" },
		});
		const tData = await db.programTrack.create({
			data: { name: "Data-Driven Methods", color: "#8b5cf6" },
		});

		const mkSession = async (
			title: string,
			startAt: Date,
			endAt: Date,
			roomId: string,
			trackId: string | null,
			submissionIds: string[],
		) => {
			const s = await db.programSession.create({
				data: { title, startAt, endAt, roomId, trackId },
			});
			for (let i = 0; i < submissionIds.length; i++) {
				await db.presentationSlot.create({
					data: { sessionId: s.id, submissionId: submissionIds[i], order: i, durationMin: 20 },
				});
			}
			return s.id;
		};

		await mkSession("Opening & Plenary Keynote", day(14, "09:00"), day(14, "10:30"), aula.id, tModel.id, [acceptedIds[0]]);
		await mkSession("ML Interatomic Potentials", day(14, "11:00"), day(14, "12:30"), aula.id, tData.id, [acceptedIds[1], acceptedIds[2]]);
		await mkSession("Phase-Field & Microstructure", day(15, "09:00"), day(15, "10:30"), r101.id, tModel.id, [acceptedIds[3]]);
		await db.scheduleBreak.create({
			data: { title: "Lunch Break", startAt: day(14, "12:30"), endAt: day(14, "13:30"), roomId: null },
		});

		// Parallel-session pair sharing a co-author (Elena Ricci) → the
		// "Co-author double-booked" pre-publish check (docs/planner/publishing).
		const sharedCoauthor = {
			firstName: "Elena",
			lastName: "Ricci",
			email: "elena.ricci@example.org",
			affiliationName: "Politecnico di Milano",
			isPresenter: false,
		};
		const clashA = await createSubmission({
			title: "Bayesian Calibration of Grain-Growth Models",
			status: SubmissionStatus.ACCEPTED,
			authorData: author(1),
			userId: authorUser(1),
			extraAuthors: [sharedCoauthor],
		});
		const clashB = await createSubmission({
			title: "Stochastic Models of Microstructure Evolution",
			status: SubmissionStatus.ACCEPTED,
			authorData: author(3),
			userId: authorUser(3),
			extraAuthors: [sharedCoauthor],
		});
		await mkSession("Uncertainty Quantification", day(15, "14:00"), day(15, "15:30"), aula.id, tData.id, [clashA.id]);
		await mkSession("Stochastic Microstructure Models", day(15, "14:00"), day(15, "15:30"), r101.id, tModel.id, [clashB.id]);

		// --- invitations --------------------------------------------------------------
		const hours = (h: number) => new Date(Date.now() + h * 3600 * 1000);
		await db.invitation.create({
			data: {
				email: "new.reviewer@example.org",
				role: UserRole.REVIEWER,
				token: randomUUID(),
				status: InvitationStatus.PENDING,
				expiresAt: hours(72),
				createdById: adminUserId,
			},
		});
		await db.invitation.create({
			data: {
				email: "emily.watson@example.org",
				role: UserRole.EDITOR,
				token: randomUUID(),
				status: InvitationStatus.USED,
				expiresAt: hours(-24),
				usedAt: hours(-48),
				usedById: userIds[4],
				createdById: adminUserId,
			},
		});
		await db.invitation.create({
			data: {
				email: "declined.person@example.org",
				role: UserRole.REVIEWER,
				token: randomUUID(),
				status: InvitationStatus.CANCELLED,
				expiresAt: hours(-2),
				createdById: adminUserId,
			},
		});

		// Helper-created status logs carry a hardcoded "Test submission" reason — reword
		const logs = await db.activityLog.findMany({ where: { type: "SUBMISSION_STATUS_CHANGED" } });
		for (const l of logs) {
			const detail = l.detail as Record<string, unknown>;
			if (detail?.reason === "Test submission") {
				await db.activityLog.update({
					where: { id: l.id },
					data: { detail: { ...detail, reason: "Submitted by author" } },
				});
			}
		}

		// --- make the e2e service accounts look like real people ----------------------
		// Safe at this point: auth-setup already logged everyone in (sessions are
		// keyed by user id, not email) and getTestUserIds() has cached the ids.
		const makeover: Array<[string, { firstName: string; lastName: string; email: string; affiliation: string; country: string }]> = [
			["test@e2e.local", { firstName: "Tomasz", lastName: "Zielinski", email: "tomasz.zielinski@example.org", affiliation: "Warsaw University of Technology", country: "PL" }],
			["admin@e2e.local", { firstName: "Joanna", lastName: "Wisniewska", email: "joanna.wisniewska@example.org", affiliation: "Conference Office", country: "PL" }],
			["reviewer@e2e.local", { firstName: "Robert", lastName: "Garcia", email: "robert.garcia@example.org", affiliation: "University of Texas at Austin", country: "US" }],
			["editor@e2e.local", { firstName: "Helen", lastName: "Park", email: "helen.park@example.org", affiliation: "KAIST", country: "KR" }],
			["unverified@e2e.local", { firstName: "Ben", lastName: "Fischer", email: "ben.fischer@example.org", affiliation: "TU Munich", country: "DE" }],
			["admin-verify-test@e2e.local", { firstName: "Olga", lastName: "Petrova", email: "olga.petrova@example.org", affiliation: "Sofia University", country: "BG" }],
			["reset-test@e2e.local", { firstName: "David", lastName: "Kim", email: "david.kim@example.org", affiliation: "Seoul National University", country: "KR" }],
		];
		for (const [oldEmail, m] of makeover) {
			const u = await db.user.findUnique({ where: { email: oldEmail } });
			if (!u) continue;
			const aff = await db.affiliation.upsert({
				where: { name: m.affiliation },
				update: {},
				create: { name: m.affiliation },
			});
			await db.user.update({
				where: { id: u.id },
				data: {
					firstName: m.firstName,
					lastName: m.lastName,
					email: m.email,
					affiliationId: aff.id,
					country: m.country,
				},
			});
		}

		await ensureDocsExtras(adminUserId, reviewerUserId);
		await ensureDocsDocuments(adminUserId, testUserId);
		await ensureDocsScreenshotExtras(adminUserId);
		await resolveCtx();
	});

	// ---- Part 1: Configuration --------------------------------------------------

	test("01 login screen", async ({ browser, baseURL }) => {
		// Force a guest session — the project storageState would otherwise leave us
		// logged in as admin, and /login redirects authenticated users to the app.
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			storageState: { cookies: [], origins: [] },
		});
		const page = await context.newPage();
		await page.goto(`${baseURL}/login`);
		await shot(page, "01-configuration-login.png", { full: false });
		await context.close();
	});

	test("02 configuration tabs", async ({ page }) => {
		await page.goto("/admin/settings");
		await shot(page, "02-configuration-tabs.png", { full: false });
	});

	test("03 installer", async ({ browser }) => {
		const installUrl = process.env.DOCS_INSTALL_URL;
		test.skip(!installUrl, "Set DOCS_INSTALL_URL to a fresh (uninstalled) instance");
		const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
		const page = await context.newPage();
		await page.goto(`${installUrl}/install`);
		await shot(page, "03-configuration-install.png");
		await context.close();
	});

	const settingsTabs: Array<[string, string, string, number]> = [
		["04", "conference", "04-configuration-conference.png", 2000],
		["05", "submissions", "05-configuration-submissions.png", 2400],
		["06", "types", "06-configuration-submission-types.png", 1300],
		["07", "tracks", "07-configuration-tracks.png", 1100],
		["08", "program", "08-configuration-program.png", 1800],
		["09", "emails", "09-configuration-email-templates.png", 2800],
		["10", "branding", "10-configuration-branding.png", 1700],
		["11", "fee", "11-configuration-fee.png", 1500],
		["12", "reminders", "12-configuration-reminders.png", 1600],
		["13", "survey", "13-configuration-survey.png", 1700],
		["15", "invitations", "15-configuration-invitations.png", 1000],
		["16", "documents", "16-settings-documents.png", 1400],
	];
	for (const [num, tab, file, height] of settingsTabs) {
		test(`${num} settings tab ${tab}`, async ({ page }) => {
			await page.goto(`/admin/settings?tab=${tab}`);
			await shot(page, file, { height });
		});
	}

	test("14 terms of service (preview)", async ({ page }) => {
		await page.goto("/admin/settings?tab=tos");
		await page.getByRole("tab", { name: /preview/i }).or(page.getByRole("button", { name: /preview/i })).first().click();
		await shot(page, "14-configuration-terms-of-service.png", { height: 1300 });
	});

	// ---- Part 2: Managing ---------------------------------------------------------

	test("16+17 dashboard", async ({ page }) => {
		await page.goto("/admin/dashboard");
		await page.waitForTimeout(1500); // charts/sparklines animate in
		await shot(page, "16-managing-dashboard-full.png", { height: 3200 });
		await shot(page, "17-managing-dashboard.png");
	});

	test("18 submissions list", async ({ page }) => {
		await page.goto("/admin/submissions");
		await shot(page, "18-managing-submissions-list.png", { height: 2000 });
	});

	test("19 submission detail with version selector", async ({ page }) => {
		await page.goto(`/admin/submissions/${ctx.multiVersionId}`);
		await shot(page, "19-managing-submission-versions.png");
	});

	test("34 submission version compare (side-by-side)", async ({ page }) => {
		await page.goto(
			`/admin/submissions/${ctx.multiVersionId}/compare?view=split`,
		);
		await page
			.getByTestId("diff-base-select")
			.waitFor({ timeout: 10000 })
			.catch(() => {});
		await shot(page, "34-managing-submission-compare.png", { height: 2400 });
	});

	test("20 assign reviewer dialog", async ({ page }) => {
		await page.goto(`/admin/submissions/${ctx.submittedId}`);
		await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
		await runSubmissionAction(page, "Assign Reviewer");
		await expect(page.getByRole("dialog")).toBeVisible();
		await shot(page, "20-managing-assign-reviewer-dialog.png", { full: false });
	});

	test("21 users list", async ({ page }) => {
		await page.goto("/admin/users");
		await shot(page, "21-managing-users-list.png", { height: 2000 });
	});

	test("22+23 user detail", async ({ page }) => {
		await page.goto(`/admin/users/${ctx.profileUserId}`);
		await shot(page, "22-managing-user-detail.png", { height: 1800 });
		const panel = page.getByText(/submissions/i).first();
		await panel.scrollIntoViewIfNeeded().catch(() => {});
		await shot(page, "23-managing-user-submissions.png");
	});

	test("24 invitations list", async ({ page }) => {
		await page.goto("/admin/invitations");
		await shot(page, "24-managing-invitations.png");
	});

	test("25 program planner", async ({ page }) => {
		await page.goto("/admin/program-planner");
		await page.waitForTimeout(1500); // calendar layout settles
		await shot(page, "25-managing-program-planner.png");
	});

	test("26 extraction status on submission", async ({ page }) => {
		await page.goto(`/admin/submissions/${ctx.docxId}`);
		await shot(page, "26-managing-extraction-status.png", { height: 1300 });
	});

	test("27 activity history on submission", async ({ page }) => {
		await page.goto(`/admin/submissions/${ctx.decidedId}`);
		await page.getByRole("tab", { name: /history/i }).click();
		await page.waitForTimeout(500);
		await shot(page, "27-managing-activity-history.png", { height: 1000 });
	});

	test("33 email campaigns composer", async ({ page }) => {
		const db = getPrisma();
		const recipients = [
			{ email: "sofia.rossi@example.org", firstName: "Sofia", lastName: "Rossi", titles: "Crystal Plasticity FEM of Ti-6Al-4V Lattice Structures" },
			{ email: "lukas.weber@example.org", firstName: "Lukas", lastName: "Weber", titles: "High-Throughput DFT Screening of High-Entropy Alloys" },
			{ email: "kenji.tanaka@example.org", firstName: "Kenji", lastName: "Tanaka", titles: "Digital Twin of an Industrial Heat-Treatment Line" },
			{ email: "anna.nowak@example.org", firstName: "Anna", lastName: "Nowak", titles: "Molecular Dynamics Study of Hydrogen Embrittlement in Ferrite" },
		];
		const campaign = await db.emailCampaign.create({
			data: {
				subject: "ICCMS 2026 — programme update for {{firstName}}",
				format: "MARKDOWN",
				bodySource:
					"Dear **{{firstName}} {{lastName}}**,\n\n" +
					"Thank you for your submission _{{title}}_. The final programme is now " +
					"online and your presentation slot has been confirmed.\n\n" +
					"See you in Krakow!\n\nThe ICCMS 2026 Organising Committee",
				status: "DRAFT",
				totalRecipients: recipients.length,
				recipients: { create: recipients },
			},
		});
		await page.goto(`/admin/bulk-email/${campaign.id}`);
		// Fixed clip (not the auto-trim path): the two-column composer puts the
		// action buttons in the right inspector rail, so a height that clears the
		// taller editor card captures the whole layout without trailing whitespace.
		await page.setViewportSize({ width: 1440, height: 960 });
		await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
		await page.waitForTimeout(600);
		await page.screenshot({
			path: path.join(SHOTS_DIR, "33-managing-email-campaigns.png"),
			clip: { x: 0, y: 0, width: 1440, height: 900 },
		});
	});

	// ---- Part 3: Program Planner --------------------------------------------------

	test("28 session editor", async ({ page }) => {
		await page.goto("/admin/program-planner");
		await page.waitForTimeout(1500); // calendar layout settles
		await page.getByTestId("session-card-title").first().click();
		await expect(page.getByTestId("session-editor")).toBeVisible();
		await page.waitForTimeout(500);
		await shot(page, "28-planner-session-editor.png");
	});

	test("58 cancelled presentation in session editor", async ({ page }) => {
		await page.goto("/admin/program-planner");
		await page.waitForTimeout(1500); // calendar layout settles
		// The "ML Interatomic Potentials" session has two talks — cancel one so the
		// shot shows a struck-through row next to a live one.
		await page
			.getByTestId("session-card-title")
			.filter({ hasText: "ML Interatomic Potentials" })
			.first()
			.click();
		await expect(page.getByTestId("session-editor")).toBeVisible();
		const toggle = page
			.getByTestId(/^presentation-cancel-/)
			.first();
		await toggle.click();
		await page.waitForTimeout(500);
		await shot(page, "58-planner-cancelled-presentation.png");
		// Restore so other shots (public program, preview) see no cancelled talk.
		await toggle.click();
		await page.waitForTimeout(300);
	});

	test("29 reading mode", async ({ page }) => {
		await page.goto("/admin/program-planner");
		await page.waitForTimeout(1500);
		await page.getByTestId("sidebar-bulk-read").click();
		await expect(page.getByTestId("bulk-reader")).toBeVisible();
		await page.waitForTimeout(500);
		await shot(page, "29-planner-reading-mode.png");
	});

	test("30 autoplan proposal preview", async ({ page }) => {
		const servicesUp =
			(await serviceUp(process.env.LLM_API_URL)) &&
			(await serviceUp(process.env.PLANNER_API_URL));
		test.skip(!servicesUp, "Autoplan needs LLM_API_URL + PLANNER_API_URL reachable");
		test.setTimeout(240_000);
		await page.goto("/admin/program-planner/auto-plan");
		await page.getByRole("button", { name: "Generate proposal" }).click();
		// Embedding → clustering → labeling round-trips over the network.
		await expect(page.getByRole("heading", { name: "Proposal ready" })).toBeVisible({
			timeout: 200_000,
		});
		await page.waitForTimeout(800);
		await shot(page, "30-planner-autoplan-preview.png");
	});

	test("31 publish dialog", async ({ page }) => {
		await page.goto("/admin/program-planner");
		await page.waitForTimeout(1500);
		await page.getByTestId("publish-button").click();
		await expect(page.getByTestId("publish-dialog")).toBeVisible();
		// Issue checks load asynchronously; wait for the list (sessions have no chairs).
		await page.getByTestId("publish-issues-list").waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
		await page.waitForTimeout(500);
		await shot(page, "31-planner-publish-dialog.png", { full: false });
	});

	test("54 co-author conflict check", async ({ page }) => {
		await page.goto("/admin/program-planner");
		await page.waitForTimeout(1500);
		await page.getByTestId("publish-button").click();
		await expect(page.getByTestId("publish-dialog")).toBeVisible();
		const coauthorIssue = page
			.getByTestId("publish-issues-list")
			.getByText(/Co-author double-booked/i)
			.first();
		await coauthorIssue.scrollIntoViewIfNeeded();
		await page.waitForTimeout(300);
		await page.getByTestId("publish-dialog").screenshot({
			path: path.join(SHOTS_DIR, "54-planner-coauthor-conflict.png"),
		});
	});

	test("32 public program", async ({ page }) => {
		await setSchedulePublished(true);
		try {
			await page.goto("/program");
			await page.waitForTimeout(1200);
			await shot(page, "32-program-public-page.png", { height: 2200 });
		} finally {
			await setSchedulePublished(false);
		}
	});

	// ---- Part 4: Exhibitors, reviewer compare, survey templates -------------------

	test("35 exhibitors list", async ({ page }) => {
		await page.goto("/admin/exhibitors");
		await shot(page, "35-managing-exhibitors-list.png", { height: 1600 });
	});

	test("36+37 exhibitor detail and decision dialog", async ({ page }) => {
		await page.goto(`/admin/exhibitors/${ctx.exhibitorPendingId}`);
		await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
		await shot(page, "36-managing-exhibitor-detail.png", { height: 1500 });
		// Open (but don't confirm) the decision dialog so the exhibitor stays PENDING.
		await page.getByTestId("exhibitor-approve").click();
		await expect(page.getByRole("dialog")).toBeVisible();
		await page
			.getByTestId("decide-exhibitor-reason")
			.fill("Strong fit for the materials-characterisation track — approved for a Gold booth.");
		await page.waitForTimeout(300);
		await shot(page, "37-managing-exhibitor-decision.png", { full: false });
	});

	test("38 conference exhibitors section", async ({ page }) => {
		await page.goto("/admin/settings?tab=conference");
		await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
		const section = page
			.getByTestId("settings-exhibitors-enabled")
			.locator("xpath=ancestor::section[1]");
		await section.scrollIntoViewIfNeeded();
		await page.waitForTimeout(500);
		await section.screenshot({
			path: path.join(SHOTS_DIR, "38-configuration-exhibitors-section.png"),
		});
	});

	test("39 reviewer version compare (side-by-side)", async ({ browser, baseURL }, testInfo) => {
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			baseURL,
			storageState: `e2e/.auth/reviewer-${testInfo.parallelIndex}.json`,
		});
		const page = await context.newPage();
		await page.goto(`${baseURL}/reviews/${ctx.reviewerAssignmentId}/compare?view=split`);
		await page.getByTestId("diff-base-select").waitFor({ timeout: 10000 }).catch(() => {});
		await shot(page, "39-reviewing-compare.png", { height: 2400 });
		await context.close();
	});

	test("40 survey import template dialog", async ({ page }) => {
		await page.goto("/admin/settings?tab=survey");
		await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
		await page.getByTestId("import-template-button").click();
		await expect(page.getByRole("dialog")).toBeVisible();
		await page.waitForTimeout(400);
		await shot(page, "40-configuration-survey-template.png", { full: false });
	});

	test("41 bulk-email recipient selection", async ({ page }) => {
		await page.goto("/admin/users");
		await page.getByText(/Page \d+ of [1-9]/).first().waitFor({ timeout: 15000 }).catch(() => {});
		const rows = page.getByTestId("user-row");
		for (const i of [0, 1, 2]) await rows.nth(i).getByRole("checkbox").check();
		await page.getByRole("combobox").filter({ hasText: "Bulk actions" }).click();
		await page.getByRole("option", { name: "Send email" }).waitFor({ timeout: 5000 }).catch(() => {});
		await page.waitForTimeout(300);
		await shot(page, "41-managing-bulk-email-recipients.png", { full: false });
	});

	test("42 exhibitor registration choice", async ({ browser, baseURL }) => {
		// Unauthenticated: the account-type choice only renders on the public register
		// form, and only while exhibitor signup is enabled (seed turns it on).
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			storageState: { cookies: [], origins: [] },
		});
		const page = await context.newPage();
		await page.goto(`${baseURL}/register`);
		await page.getByTestId("register-account-type-exhibitor").waitFor({ timeout: 10000 });
		await page.getByRole("radiogroup").first().scrollIntoViewIfNeeded();
		await shot(page, "42-managing-exhibitor-registration-choice.png", { full: false });
		await context.close();
	});

	// ---- Part 5: Documents --------------------------------------------------------

	test("43 documents templates", async ({ page }) => {
		await page.goto("/admin/documents");
		await shot(page, "43-managing-documents-templates.png", { height: 1100 });
	});

	test("44 documents generate dialog", async ({ page }) => {
		const db = getPrisma();
		// Maria (reviewer) has no accepted abstract → {abstractTitle} shows Missing.
		const maria = await db.user.findUniqueOrThrow({
			where: { email: "maria.kowalska@example.org" },
		});
		await page.goto(`/admin/users/${maria.id}`);
		await page.getByTestId("add-document-button").click();
		await page.getByTestId("document-template-select").click();
		await page.getByRole("option", { name: "Visa invitation letter" }).click();
		await expect(page.getByTestId("resolution-row").first()).toBeVisible();
		await page.waitForTimeout(400);
		await shot(page, "44-managing-documents-generate.png", { full: false });
	});

	test("45 documents generated list", async ({ page }) => {
		await page.goto("/admin/documents?tab=generated");
		await page.waitForTimeout(500);
		await shot(page, "45-managing-documents-generated.png", { height: 1100 });
	});

	test("46 documents bulk action", async ({ page }) => {
		await page.goto("/admin/users");
		await page.getByText(/Page \d+ of [1-9]/).first().waitFor({ timeout: 15000 }).catch(() => {});
		const rows = page.getByTestId("user-row");
		for (const i of [0, 1, 2]) await rows.nth(i).getByRole("checkbox").check();
		await page.getByRole("combobox").filter({ hasText: "Bulk actions" }).click();
		await page.getByRole("option", { name: "Generate document" }).click();
		await page.getByRole("button", { name: "Apply" }).click();
		await page.getByTestId("bulk-template-select").click();
		await page.getByRole("option", { name: "Visa invitation letter" }).click();
		await page.getByTestId("bulk-review-button").click();
		await expect(page.getByText(/will be generated/)).toBeVisible();
		await page.waitForTimeout(300);
		await shot(page, "46-managing-documents-bulk.png", { full: false });
	});

	test("47 my documents (participant)", async ({ browser, baseURL }, testInfo) => {
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			baseURL,
			storageState: `e2e/.auth/user-${testInfo.parallelIndex}.json`,
		});
		const page = await context.newPage();
		await page.goto(`${baseURL}/documents`);
		await page.waitForTimeout(500);
		await shot(page, "47-managing-documents-my.png", { height: 1000 });
		await context.close();
	});

	// ---- Part 6: Camera-ready, planner events, attachments, survey -----------------

	test("48 bulk-email attachments", async ({ page }) => {
		const db = getPrisma();
		const campaign = await db.emailCampaign.create({
			data: {
				subject: "ICCMS 2026 — sponsor press kit",
				format: "MARKDOWN",
				bodySource: "Please find the press kit attached.",
				status: "DRAFT",
				totalRecipients: 0,
			},
		});
		await page.goto(`/admin/bulk-email/${campaign.id}`);
		const dropzoneInput = page
			.getByTestId("attachment-dropzone")
			.locator('input[type="file"]');
		await dropzoneInput.setInputFiles({
			name: "press-kit.pdf",
			mimeType: "application/pdf",
			buffer: DOCS_PDF,
		});
		await expect(page.getByTestId("attachment-list")).toContainText(
			"press-kit.pdf",
			{ timeout: 10000 },
		);
		await page.waitForTimeout(300);
		await shot(page, "48-managing-bulk-email-attachments.png", { full: false });
	});

	test("49 program theme selector", async ({ page }) => {
		await page.goto("/admin/settings?tab=program");
		await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
		const select = page.getByTestId("program-theme-select");
		await select.scrollIntoViewIfNeeded();
		await page.waitForTimeout(300);
		const section = select.locator("xpath=ancestor::section[1]");
		await section.screenshot({
			path: path.join(SHOTS_DIR, "49-configuration-program-theme.png"),
		});
	});

	test("50 presentation preview with favourite", async ({ page }) => {
		await setSchedulePublished(true);
		try {
			await page.goto("/program");
			await page.getByPlaceholder(/Search talks/i).waitFor({ state: "visible", timeout: 15000 });
			const row = page
				.getByTestId("presentation-row")
				.filter({ hasText: "Crystal Plasticity FEM" });
			await row.first().click();
			await expect(page.getByTestId("presentation-preview")).toBeVisible();
			await page.waitForTimeout(400);
			await shot(page, "50-program-presentation-preview.png", { full: false });
		} finally {
			await setSchedulePublished(false);
		}
	});

	test("51 program notifications toggle", async ({ page }) => {
		await setSchedulePublished(true);
		try {
			await page.goto("/program");
			await page.getByPlaceholder(/Search talks/i).waitFor({ state: "visible", timeout: 15000 });
			await page.getByTestId("program-auth-link").first().click();
			await expect(page.getByTestId("program-user-menu")).toBeVisible();
			await page.waitForTimeout(300);
			await shot(page, "51-program-notifications-toggle.png", { full: false });
		} finally {
			await setSchedulePublished(false);
		}
	});

	test("52 planner create event dialog", async ({ page }) => {
		await page.goto("/admin/program-planner");
		await page.waitForTimeout(1500); // calendar layout settles
		await page.getByRole("button", { name: "New" }).click();
		await expect(page.getByTestId("create-event-dialog")).toBeVisible();
		await page.getByTestId("create-event-type-event").click();
		await page.getByTestId("create-event-title").fill("Welcome Reception");
		await page
			.getByTestId("create-event-description")
			.fill("Informal welcome reception with drinks and canapés.");
		await page.getByTestId("create-event-location").fill("Hotel Stary Terrace, Krakow");
		await page
			.getByTestId("create-event-location-url")
			.fill("https://example.org/hotel-stary");
		await page.waitForTimeout(300);
		await shot(page, "52-planner-create-event-dialog.png", { full: false });
	});

	test("53 program event featured card", async ({ page }) => {
		await setSchedulePublished(true);
		try {
			await page.goto("/program");
			const card = page.getByTestId(`program-event-${ctx.eventBreakId}`);
			await card.scrollIntoViewIfNeeded();
			await page.waitForTimeout(300);
			await shot(page, "53-program-event-featured-card.png", { full: false });
		} finally {
			await setSchedulePublished(false);
		}
	});

	test("54 camera-ready card", async ({ page }) => {
		await page.goto(`/admin/submissions/${ctx.decidedId}`);
		await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
		const card = page
			.getByTestId("camera-ready-input")
			.locator("xpath=ancestor::*[@data-slot='card'][1]");
		await card.scrollIntoViewIfNeeded();
		await page.waitForTimeout(300);
		await card.screenshot({
			path: path.join(SHOTS_DIR, "54-managing-submission-camera-ready-card.png"),
		});
	});

	test("55 bulk camera-ready upload skip report", async ({ page }) => {
		const db = getPrisma();
		const { sequentialNumber } = await db.submission.findUniqueOrThrow({
			where: { id: ctx.submittedId },
			select: { sequentialNumber: true },
		});
		const zip = new AdmZip();
		zip.addFile(`${sequentialNumber}-branded.pdf`, DOCS_PDF);
		zip.addFile("notes.txt", Buffer.from("not a submission"));
		zip.addFile("999999.pdf", DOCS_PDF);

		await page.goto("/admin/submissions");
		await page.getByRole("button", { name: "Upload camera-ready" }).click();
		await expect(page.getByRole("dialog")).toBeVisible();
		await page.getByTestId("camera-ready-bulk-input").setInputFiles({
			name: "camera-ready.zip",
			mimeType: "application/zip",
			buffer: zip.toBuffer(),
		});
		await page.getByRole("button", { name: "Upload", exact: true }).click();
		await expect(
			page.getByText(/camera-ready file\(s\) uploaded, \d+ skipped/),
		).toBeVisible({ timeout: 15000 });
		await page.waitForTimeout(200);
		await shot(page, "55-managing-camera-ready-bulk-upload.png", { full: false });
	});

	test("56 on-behalf submission form", async ({ page }) => {
		await page.goto(`/admin/users/${ctx.profileUserId}`);
		await page.getByTestId("add-submission-on-behalf").click();
		await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
		await shot(page, "56-managing-user-add-submission.png", { height: 2000 });
	});

	test("57 edit survey answers dialog", async ({ page }) => {
		await page.goto(`/admin/users/${ctx.profileUserId}`);
		await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
		await page.getByTestId("edit-survey-answers").click();
		await expect(page.getByRole("dialog")).toBeVisible();
		await page.waitForTimeout(400);
		await shot(page, "57-managing-user-edit-survey-answers.png", { full: false });
	});

	test("59 connect an AI assistant dialog", async ({ page }) => {
		await seedMcpConsent(page);

		await page.goto("/");
		await page.locator('[data-testid="user-menu-trigger"]:visible').click();
		await page.getByTestId("user-menu-mcp").click();
		await expect(page.getByTestId("mcp-connect-dialog")).toBeVisible();
		await page.waitForTimeout(400);
		await shot(page, "59-managing-mcp-connect-dialog.png", { full: false });
	});

	test("60 assistant authorization screen", async ({ page }) => {
		await seedMcpConsent(page, { withConsent: false });

		await page.goto(mcpAuthorizeUrl(page));
		await expect(page.getByTestId("consent-card")).toBeVisible();
		await page.waitForTimeout(400);
		await shot(page, "60-managing-mcp-consent.png", { full: false });
	});

	test("61 submission upload link", async ({ page }) => {
		const db = getPrisma();
		const secret = process.env.AUTH_SECRET;
		if (!secret) test.skip(true, "AUTH_SECRET is required to mint a link");

		const paper = await db.appSetting.findUnique({
			where: { key: "SUBMISSION_TYPE_FULL_PAPER" },
		});
		const original = (paper?.value ?? {}) as Record<string, unknown>;
		await setAppSetting("SUBMISSION_TYPE_FULL_PAPER", {
			...original,
			isActive: true,
			contentFormat: "FILE",
			allowedExtensions: ["pdf"],
			maxFileSizeMb: 20,
		});

		const submission = await createSubmission({
			title: "Adaptive Mesh Refinement for Coastal Flood Models",
			type: "FULL_PAPER",
			status: "DRAFT",
			withAuthor: true,
		});
		const { token } = createUploadToken(
			{ submissionId: submission.id, versionNumber: 1 },
			secret as string,
		);

		await page.goto(`/upload/${token}`);
		await expect(page.getByTestId("upload-title")).toBeVisible();
		await page.waitForTimeout(400);
		await shot(page, "61-managing-submission-upload-link.png", { full: false });

		await db.submission.update({
			where: { id: submission.id },
			data: { presenterId: null, currentVersionId: null },
		});
		await db.submission.delete({ where: { id: submission.id } });
		await setAppSetting("SUBMISSION_TYPE_FULL_PAPER", original);
	});
});
