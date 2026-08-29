import AdmZip from "adm-zip";
import { test, expect } from "../helpers/base-fixtures";
import { loginAs } from "../helpers/auth";
import { ADMIN_USER } from "../helpers/test-users";
import {
	createSubmission,
	createSubmissionWithFile,
	createTrack,
	deleteTrack,
} from "../helpers/test-db";

test.describe("Export Submissions as ZIP", () => {
	test.beforeEach(async ({ page }) => {
		await loginAs(page, ADMIN_USER);
	});

	test("exports TEXT submission with correct content and CSV", async ({
		page,
		testRun,
		cleanup,
	}) => {
		const trackId = await createTrack(testRun.testRunId, "TestSession");
		const sub = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Export Text Test",
			content: "My abstract content for export",
			type: "ABSTRACT",
			keywords: ["keyword1", "keyword2"],
			trackId,
			authorData: { firstName: "Main", lastName: "Author" },
			extraAuthors: [{ firstName: "Co", lastName: "Writer" }],
		});
		cleanup.track(sub.id);

		const response = await page.request.get(
			`/api/admin/submissions/export?search=${testRun.testRunId}`,
		);

		expect(response.status()).toBe(200);
		expect(response.headers()["content-type"]).toBe("application/zip");
		expect(response.headers()["content-disposition"]).toContain("attachment");

		const buffer = await response.body();
		const zip = new AdmZip(buffer);
		const entries = zip.getEntries().map((e) => e.entryName);

		expect(entries).toContain("submissions.csv");
		const txtEntry = entries.find(
			(e) => e.endsWith(".txt") && e !== "submissions.csv",
		);
		expect(txtEntry).toBeDefined();

		const txtContent = zip.readAsText(txtEntry!);
		expect(txtContent).toBe("My abstract content for export");

		const csv = zip.readAsText("submissions.csv");
		const lines = csv.split("\n");
		expect(lines[0]).toBe(
			"sequentialNumber,title,mainAuthor,coAuthors,keywords,track,acknowledgment",
		);
		const dataRow = lines.find((l) => l.includes("Export Text Test"));
		expect(dataRow).toBeDefined();
		expect(dataRow).toContain("Main Author");
		expect(dataRow).toContain("Co Writer");
		expect(dataRow).toContain("keyword1");
		expect(dataRow).toContain("keyword2");
		expect(dataRow).toContain("TestSession");

		await deleteTrack(trackId).catch(() => {});
	});

	test("exports FILE submission as original file", async ({
		page,
		testRun,
		cleanup,
	}) => {
		const sub = await createSubmissionWithFile({
			testRunId: testRun.testRunId,
			title: "Export File Test",
			type: "FULL_PAPER",
		});
		cleanup.track(sub.id);

		const response = await page.request.get(
			`/api/admin/submissions/export?search=${testRun.testRunId}`,
		);

		expect(response.status()).toBe(200);
		const buffer = await response.body();
		const zip = new AdmZip(buffer);
		const entries = zip.getEntries().map((e) => e.entryName);

		const pdfEntry = entries.find((e) => e.endsWith(".pdf"));
		expect(pdfEntry).toBeDefined();

		const pdfContent = zip.getEntry(pdfEntry!)!.getData();
		expect(pdfContent.length).toBeGreaterThan(100);
	});

	test("respects type filter", async ({ page, testRun, cleanup }) => {
		const abstract = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Filter Abstract",
			type: "ABSTRACT",
			content: "abstract content",
		});
		const fullPaper = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Filter FullPaper",
			type: "FULL_PAPER",
			content: "full paper content",
		});
		cleanup.track(abstract.id);
		cleanup.track(fullPaper.id);

		const response = await page.request.get(
			`/api/admin/submissions/export?search=${testRun.testRunId}&type=ABSTRACT`,
		);

		expect(response.status()).toBe(200);
		const buffer = await response.body();
		const zip = new AdmZip(buffer);
		const csv = zip.readAsText("submissions.csv");

		expect(csv).toContain("Filter Abstract");
		expect(csv).not.toContain("Filter FullPaper");
	});

	test("CSV has correct header and column count", async ({
		page,
		testRun,
		cleanup,
	}) => {
		const sub = await createSubmission({
			testRunId: testRun.testRunId,
			title: "CSV Format Test",
			content: "test content",
		});
		cleanup.track(sub.id);

		const response = await page.request.get(
			`/api/admin/submissions/export?search=${testRun.testRunId}`,
		);

		const buffer = await response.body();
		const zip = new AdmZip(buffer);
		const csv = zip.readAsText("submissions.csv");
		const lines = csv.split("\n");

		expect(lines[0]).toBe(
			"sequentialNumber,title,mainAuthor,coAuthors,keywords,track,acknowledgment",
		);

		const headerCommas = (lines[0].match(/,/g) || []).length;
		const dataLine = lines.find((l) => l.includes("CSV Format Test"));
		expect(dataLine).toBeDefined();
		// Count commas outside quoted fields
		const dataCommas = (
			dataLine!.match(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/g) || []
		).length;
		expect(dataCommas).toBe(headerCommas);
	});
});
