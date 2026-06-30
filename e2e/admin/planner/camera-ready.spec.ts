import AdmZip from "adm-zip";
import {
	addPresentationToSession,
	createProgramSession,
	createRoom,
	createSubmission,
	getPrisma,
	setSchedulePublished,
} from "../../helpers/test-db";
import { expect, isoDay, resetPlannerProgramDefaults, test } from "./fixtures";

// ALT differs in byte length so the replace test proves fresh bytes are served.
const PDF = Buffer.from("%PDF-1.4\n% camera-ready\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");
const PDF_ALT = Buffer.from(
	"%PDF-1.7\n% replacement camera-ready with extra padding bytes\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n",
);
const NOT_PDF = Buffer.from("This is not a PDF at all\n");

const crUrl = (slotId: string) => `/api/program/camera-ready/${slotId}`;

async function seedPresentation(testRunId: string) {
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
