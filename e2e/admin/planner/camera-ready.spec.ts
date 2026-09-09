import type { Readable } from "node:stream";
import AdmZip from "adm-zip";
import {
	addPresentationToSession,
	createProgramSession,
	createRoom,
	createSubmission,
	getPrisma,
	setAppSetting,
	setSchedulePublished,
} from "../../helpers/test-db";
import { getDefaultSetting } from "@/features/settings/defaults";
import type { SubmissionTypeConfig } from "@/features/settings/types";
import { expect, isoDay, resetPlannerProgramDefaults, test } from "./fixtures";

const PDF = Buffer.from("%PDF-1.4\n% camera-ready\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");
const PDF_ALT = Buffer.from(
	"%PDF-1.7\n% replacement camera-ready with extra padding bytes\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n",
);
const NOT_PDF = Buffer.from("This is not a PDF at all\n");

async function streamToBuffer(stream: Readable): Promise<Buffer> {
	const chunks: Buffer[] = [];
	for await (const chunk of stream) chunks.push(Buffer.from(chunk));
	return Buffer.concat(chunks);
}

const crUrl = (slotId: string) => `/api/program/camera-ready/${slotId}`;

async function setOralContentFormat(contentFormat: "TEXT" | "FILE") {
	const row = await getPrisma().appSetting.findUnique({
		where: { key: "SUBMISSION_TYPE_ORAL_PRESENTATION" },
	});
	// SAFETY: the seed writes a SubmissionTypeConfig under this key.
	const current =
		(row?.value as SubmissionTypeConfig | undefined) ??
		getDefaultSetting("SUBMISSION_TYPE_ORAL_PRESENTATION");
	await setAppSetting("SUBMISSION_TYPE_ORAL_PRESENTATION", {
		...current,
		contentFormat,
	});
}

async function seedPresentation(testRunId: string) {
	await setOralContentFormat("FILE");
	const roomId = await createRoom(testRunId, "CR Room");
	const sessionId = await createProgramSession({
		testRunId,
		title: "CR Session",
		startAt: isoDay(0, 14),
		endAt: isoDay(0, 15),
		roomId,
	});
	const submission = await createSubmission({
		testRunId,
		title: "Camera Ready Talk",
		content: "Abstract body for the camera-ready talk.",
		authorData: { firstName: "Ada", lastName: "Lovelace" },
		keywords: ["thermodynamics"],
	});
	const slotId = await addPresentationToSession(sessionId, submission.id);
	await setSchedulePublished(true);
	return { submission, slotId };
}

test.describe.serial("Camera-ready", () => {
	test.beforeEach(resetPlannerProgramDefaults);
	test.afterAll(() => setOralContentFormat("TEXT"));

	test("admin upload surfaces a public download on the program", async ({
		page,
		publicProgramPage,
		testRun,
	}) => {
		const { submission, slotId } = await seedPresentation(testRun.testRunId);

		await page.goto(`/admin/submissions/${submission.id}`);
		await page.getByTestId("camera-ready-input").setInputFiles({
			name: "document.pdf",
			mimeType: "application/pdf",
			buffer: PDF,
		});
		await expect(page.getByText("document.pdf")).toBeVisible({ timeout: 15000 });

		await publicProgramPage.goto();
		await publicProgramPage.openFirstPresentation();
		const download = page.getByTestId("camera-ready-download");
		await expect(download).toBeVisible();
		expect(await download.getAttribute("href")).toBe(crUrl(slotId));

		const response = await page.request.get(crUrl(slotId));
		expect(response.status()).toBe(200);
		expect(response.headers()["content-type"]).toContain("application/pdf");
	});

	test("a text-format type keeps its abstract and hides the download", async ({
		page,
		publicProgramPage,
		testRun,
	}) => {
		const { submission, slotId } = await seedPresentation(testRun.testRunId);

		await page.goto(`/admin/submissions/${submission.id}`);
		await page.getByTestId("camera-ready-input").setInputFiles({
			name: "document.pdf",
			mimeType: "application/pdf",
			buffer: PDF,
		});
		await expect(page.getByText("document.pdf")).toBeVisible({ timeout: 15000 });
		await setOralContentFormat("TEXT");

		expect((await page.request.get(crUrl(slotId))).status()).toBe(404);

		await publicProgramPage.goto();
		await publicProgramPage.openFirstPresentation();
		await expect(
			page.getByText("Abstract body for the camera-ready talk."),
		).toBeVisible();
		await expect(page.getByTestId("camera-ready-download")).toHaveCount(0);
	});

	test("re-upload replaces the previous file (no stale content)", async ({
		page,
		testRun,
	}) => {
		const { submission, slotId } = await seedPresentation(testRun.testRunId);
		const input = () => page.getByTestId("camera-ready-input");

		await page.goto(`/admin/submissions/${submission.id}`);
		await input().setInputFiles({
			name: "document.pdf",
			mimeType: "application/pdf",
			buffer: PDF,
		});
		await expect(page.getByText("document.pdf")).toBeVisible({ timeout: 15000 });

		await input().setInputFiles({
			name: "final.pdf",
			mimeType: "application/pdf",
			buffer: PDF_ALT,
		});
		await expect(page.getByText("final.pdf")).toBeVisible({ timeout: 15000 });
		await expect(page.getByText("document.pdf")).toHaveCount(0);

		const response = await page.request.get(crUrl(slotId));
		expect(response.status()).toBe(200);
		expect(Number(response.headers()["content-length"])).toBe(PDF_ALT.length);
	});

	test("removing a camera-ready makes the public download disappear", async ({
		page,
		publicProgramPage,
		testRun,
	}) => {
		const { submission, slotId } = await seedPresentation(testRun.testRunId);

		await page.goto(`/admin/submissions/${submission.id}`);
		await page.getByTestId("camera-ready-input").setInputFiles({
			name: "document.pdf",
			mimeType: "application/pdf",
			buffer: PDF,
		});
		await expect(page.getByText("document.pdf")).toBeVisible({ timeout: 15000 });
		expect((await page.request.get(crUrl(slotId))).status()).toBe(200);

		await page.getByRole("button", { name: "Remove" }).click();
		await expect(page.getByText(/No camera-ready file/)).toBeVisible();
		expect((await page.request.get(crUrl(slotId))).status()).toBe(404);

		await publicProgramPage.goto();
		await publicProgramPage.openFirstPresentation();
		await expect(page.getByTestId("camera-ready-download")).toHaveCount(0);
	});

	test("public download is gated on a published schedule", async ({
		page,
		testRun,
	}) => {
		const { submission, slotId } = await seedPresentation(testRun.testRunId);

		await page.goto(`/admin/submissions/${submission.id}`);
		await page.getByTestId("camera-ready-input").setInputFiles({
			name: "document.pdf",
			mimeType: "application/pdf",
			buffer: PDF,
		});
		await expect(page.getByText("document.pdf")).toBeVisible({ timeout: 15000 });
		expect((await page.request.get(crUrl(slotId))).status()).toBe(200);

		await setSchedulePublished(false);
		expect((await page.request.get(crUrl(slotId))).status()).toBe(404);
	});

	test("a non-PDF upload is rejected and stores nothing", async ({
		page,
		testRun,
	}) => {
		const { submission, slotId } = await seedPresentation(testRun.testRunId);

		await page.goto(`/admin/submissions/${submission.id}`);
		await page.getByTestId("camera-ready-input").setInputFiles({
			name: "fake.pdf",
			mimeType: "application/pdf",
			buffer: NOT_PDF,
		});

		await expect(page.getByText(/Unrecognized file format/i)).toBeVisible();
		expect((await page.request.get(crUrl(slotId))).status()).toBe(404);
	});

	test("short link serves the PDF by submission number", async ({
		page,
		testRun,
	}) => {
		const { submission, slotId } = await seedPresentation(testRun.testRunId);
		const { sequentialNumber } = await getPrisma().submission.findUniqueOrThrow({
			where: { id: submission.id },
			select: { sequentialNumber: true },
		});

		await page.goto(`/admin/submissions/${submission.id}`);
		await page.getByTestId("camera-ready-input").setInputFiles({
			name: "document.pdf",
			mimeType: "application/pdf",
			buffer: PDF,
		});
		await expect(page.getByText("document.pdf")).toBeVisible({ timeout: 15000 });

		for (const n of [
			String(sequentialNumber),
			String(sequentialNumber).padStart(5, "0"),
			`${String(sequentialNumber).padStart(3, "0")}.pdf`,
		]) {
			const response = await page.request.get(`/s/${n}`);
			expect(response.status()).toBe(200);
			expect(response.headers()["content-type"]).toContain("application/pdf");
		}

		expect((await page.request.get("/s/999999")).status()).toBe(404);
		expect((await page.request.get("/s/abc")).status()).toBe(404);

		await setSchedulePublished(false);
		expect(
			(await page.request.get(`/s/${sequentialNumber}`)).status(),
		).toBe(404);
		expect((await page.request.get(crUrl(slotId))).status()).toBe(404);
	});

	test("QR panel saves settings and generates a ZIP of short links", async ({
		page,
		programSettingsPage,
		testRun,
	}) => {
		const { submission } = await seedPresentation(testRun.testRunId);
		const { sequentialNumber } = await getPrisma().submission.findUniqueOrThrow({
			where: { id: submission.id },
			select: { sequentialNumber: true },
		});

		await programSettingsPage.goto();
		await page.getByTestId("qr-base-url").fill("https://short.example/s");

		const zipDownload = page.waitForEvent("download");
		await page.getByTestId("qr-generate-zip").click();
		const entries = new AdmZip(
			await (await zipDownload).createReadStream().then(streamToBuffer),
		).getEntries();

		const entry = entries.find(
			(e) => e.entryName === `${sequentialNumber}.svg`,
		);
		expect(entry).toBeDefined();
		expect(entry?.getData().toString("utf8")).toContain("<svg");

		const programDownload = page.waitForEvent("download");
		await page.getByTestId("qr-generate-program").click();
		expect((await programDownload).suggestedFilename()).toBe("program-qr.svg");

		await page.locator("#format").click();
		await page.getByRole("option", { name: "EPS", exact: true }).click();

		const epsZipDownload = page.waitForEvent("download");
		await page.getByTestId("qr-generate-zip").click();
		const epsEntry = new AdmZip(
			await (await epsZipDownload).createReadStream().then(streamToBuffer),
		)
			.getEntries()
			.find((e) => e.entryName === `${sequentialNumber}.eps`);
		expect(epsEntry?.getData().toString("utf8")).toContain(
			"%!PS-Adobe-3.0 EPSF-3.0",
		);

		const epsProgramDownload = page.waitForEvent("download");
		await page.getByTestId("qr-generate-program").click();
		expect((await epsProgramDownload).suggestedFilename()).toBe(
			"program-qr.eps",
		);

		await programSettingsPage.goto();
		await expect(page.getByTestId("qr-base-url")).toHaveValue(
			"https://short.example/s",
		);
	});

	test("bulk ZIP uploads matched PDFs and reports skips", async ({
		page,
		testRun,
	}) => {
		const { submission, slotId } = await seedPresentation(testRun.testRunId);
		const { sequentialNumber } = await getPrisma().submission.findUniqueOrThrow({
			where: { id: submission.id },
			select: { sequentialNumber: true },
		});

		const zip = new AdmZip();
		zip.addFile(`${sequentialNumber}-branded.pdf`, PDF);
		zip.addFile("submissions.csv", Buffer.from("sequentialNumber,title\n"));
		zip.addFile("notes.txt", Buffer.from("not a submission"));
		zip.addFile("999999.pdf", PDF);

		await page.goto("/admin/submissions");
		await page.getByRole("button", { name: "Upload camera-ready" }).click();
		await page.getByTestId("camera-ready-bulk-input").setInputFiles({
			name: "camera-ready.zip",
			mimeType: "application/zip",
			buffer: zip.toBuffer(),
		});
		await page.getByRole("button", { name: "Upload", exact: true }).click();

		await expect(
			page.getByText(/1 camera-ready file\(s\) uploaded, 2 skipped/),
		).toBeVisible({ timeout: 15000 });

		const response = await page.request.get(crUrl(slotId));
		expect(response.status()).toBe(200);
		expect(response.headers()["content-type"]).toContain("application/pdf");
	});
});
