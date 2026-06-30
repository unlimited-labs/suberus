import path from "node:path";
import {
	addPresentationToSession,
	createProgramSession,
	createRoom,
	createSubmission,
	setSchedulePublished,
} from "../../helpers/test-db";
import { expect, isoDay, resetPlannerProgramDefaults, test } from "./fixtures";

const PDF = path.resolve("e2e/submissions/fixtures/document.pdf");

test.describe.serial("Camera-ready", () => {
	test.beforeEach(resetPlannerProgramDefaults);

	test("admin upload surfaces a public camera-ready download on the program", async ({
		page,
		publicProgramPage,
		testRun,
	}) => {
		const roomId = await createRoom(testRun.testRunId, "CR Room");
		const sessionId = await createProgramSession({
			testRunId: testRun.testRunId,
			title: "CR Session",
			startAt: isoDay(0, 14),
			endAt: isoDay(0, 15),
			roomId,
		});
		const submission = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Camera Ready Talk",
			content: "Abstract body for the camera-ready talk.",
			authorData: { firstName: "Ada", lastName: "Lovelace" },
			keywords: ["thermodynamics"],
		});
		await addPresentationToSession(sessionId, submission.id);
		await setSchedulePublished(true);

		await page.goto(`/admin/submissions/${submission.id}`);
		await page.getByTestId("camera-ready-input").setInputFiles(PDF);
		await expect(page.getByText("document.pdf")).toBeVisible({ timeout: 15000 });

		await publicProgramPage.goto();
		await publicProgramPage.openFirstPresentation();
		const download = page.getByTestId("camera-ready-download");
		await expect(download).toBeVisible();
		const href = await download.getAttribute("href");
		expect(href).toMatch(/\/api\/program\/camera-ready\//);

		const response = await page.request.get(href ?? "");
		expect(response.status()).toBe(200);
		expect(response.headers()["content-type"]).toContain("application/pdf");
	});
});
