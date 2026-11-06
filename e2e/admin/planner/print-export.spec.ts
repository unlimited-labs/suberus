import { readFileSync } from "node:fs";
import AdmZip from "adm-zip";
import * as XLSX from "xlsx";
import { SubmissionStatus } from "../../../src/generated/prisma/enums";
import {
	addPresentationToSession,
	createProgramSession,
	createRoom,
	createSubmission,
	getPrisma,
	setAppSetting,
} from "../../helpers/test-db";
import { expect, isoDay, test } from "./fixtures";

test.describe.serial("Planner — Printed program export", () => {
	test.afterAll(async () => {
		await setAppSetting("PRINT_EXPORT_OPTIONS", {});
	});

	test("downloads the program as xlsx from the planner Export menu and remembers the options", async ({
		page,
		testRun,
		cleanup,
	}) => {
		const sub = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Printed Talk",
			status: SubmissionStatus.ACCEPTED,
		});
		cleanup.track(sub.id);
		const roomId = await createRoom(testRun.testRunId, "Print Room");
		const sessionId = await createProgramSession({
			testRunId: testRun.testRunId,
			title: "Print Session",
			startAt: isoDay(1, 9),
			endAt: isoDay(1, 10),
			roomId,
		});
		await addPresentationToSession(sessionId, sub.id, { durationMin: 20 });

		await page.goto("/admin/program-planner");
		await page.getByTestId("print-export-menu").click();
		await page.getByTestId("print-export-xlsx").click();
		await expect(page).toHaveURL(/program-planner\/export\?format=xlsx/);

		await page.getByTestId("print-parts").getByText("Author index").click();
		await page.getByRole("radio", { name: "Polski" }).click();

		const downloadPromise = page.waitForEvent("download");
		await page.getByTestId("print-download").click();
		const download = await downloadPromise;
		expect(download.suggestedFilename()).toMatch(/^program(-DRAFT)?\.xlsx$/);

		const wb = XLSX.read(readFileSync(await download.path()), { type: "buffer" });
		expect(wb.SheetNames[0]).toBe("Program");
		expect(wb.SheetNames).not.toContain("Autorzy");
		const program = wb.Sheets.Program;
		const rows = program ? XLSX.utils.sheet_to_json<string[]>(program, { header: 1 }) : [];
		expect(rows[0]).toContain("Kod sesji");
		expect(rows.some((r) => r.includes(`${testRun.testRunId}_Print Session`))).toBe(true);

		const saved = await getPrisma().appSetting.findUnique({ where: { key: "PRINT_EXPORT_OPTIONS" } });
		expect(saved?.value).toMatchObject({ language: "pl", parts: ["title", "glance", "detailed"] });
	});

	test("previews the booklet as pages with a page counter, and Excel as sheets", async ({ page, testRun }) => {
		const roomA = await createRoom(testRun.testRunId, "Aula");
		const roomB = await createRoom(testRun.testRunId, "Sala B");
		for (const [i, roomId] of [roomA, roomB, roomA].entries()) {
			const sub = await createSubmission({
				testRunId: testRun.testRunId,
				title: `Previewed Talk ${i}`,
				status: SubmissionStatus.ACCEPTED,
			});
			const sessionId = await createProgramSession({
				testRunId: testRun.testRunId,
				title: `Preview Session ${i}`,
				startAt: isoDay(1 + i, 9),
				endAt: isoDay(1 + i, 11),
				roomId,
			});
			await addPresentationToSession(sessionId, sub.id, { durationMin: 20 });
		}

		await page.goto("/admin/program-planner/export?format=docx");
		await expect(page.getByTestId("print-preview-page").first()).toBeVisible();
		await expect(page.getByTestId("print-page-counter")).toContainText(/Page 1 \/ \d+/);
		expect(await page.getByTestId("print-preview-page").count()).toBeGreaterThanOrEqual(4);
		const docxDownload = page.waitForEvent("download");
		await page.getByTestId("print-download").click();
		const docx = new AdmZip(readFileSync(await (await docxDownload).path()));
		expect(docx.getEntry("word/document.xml")?.getData().toString("utf8")).toContain("Preview Session 0");

		await page.getByRole("radio", { name: "Excel" }).click();
		await expect(page.getByTestId("print-sheet-preview").first()).toBeVisible();

		await page.setViewportSize({ width: 390, height: 844 });
		await page.getByRole("radio", { name: "Word" }).click();
		await expect(page.getByTestId("print-preview-page").first()).toBeVisible();
	});

	test("blocks the download when neither glance nor detailed program is included", async ({ page, testRun }) => {
		const roomId = await createRoom(testRun.testRunId, "Print Room 2");
		await createProgramSession({
			testRunId: testRun.testRunId,
			title: "Print Session 2",
			startAt: isoDay(1, 9),
			endAt: isoDay(1, 10),
			roomId,
		});
		await page.goto("/admin/program-planner/export?format=docx");
		const parts = page.getByTestId("print-parts");
		await parts.getByText("Program at a glance").click();
		await parts.getByText("Detailed program").click();
		await expect(page.getByTestId("print-download")).toBeDisabled();
		await expect(page.getByTestId("print-download-note")).toContainText("Include Program at a glance or Detailed program");
	});
});
