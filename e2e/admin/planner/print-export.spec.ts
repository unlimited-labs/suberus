import { readFileSync } from "node:fs";
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

	test("explains why a format cannot be downloaded yet", async ({ page, testRun }) => {
		const roomId = await createRoom(testRun.testRunId, "Print Room 2");
		await createProgramSession({
			testRunId: testRun.testRunId,
			title: "Print Session 2",
			startAt: isoDay(1, 9),
			endAt: isoDay(1, 10),
			roomId,
		});
		await page.goto("/admin/program-planner/export?format=idml");
		await expect(page.getByTestId("print-download")).toBeDisabled();
		await expect(page.getByTestId("print-download-note")).toContainText("not available");
	});
});
