import AdmZip from "adm-zip";
import * as XLSX from "xlsx";
import { test, expect } from "../helpers/base-fixtures";
import { loginAs } from "../helpers/auth";
import { ADMIN_USER } from "../helpers/test-users";
import {
	createSubmission,
	createSubmissionWithFile,
	createTrack,
	deleteTrack,
} from "../helpers/test-db";

const MANIFEST = "submissions.xlsx";
const HEADER = [
	"Number",
	"Title",
	"Main author",
	"Co-authors",
	"Keywords",
	"Track",
	"Acknowledgment",
];

function findRow(rows: string[][], title: string): string[] {
	const row = rows.find((r) => r.some((c) => c.includes(title)));
	expect(row).toBeDefined();
	return row!;
}

function readManifest(zip: AdmZip): string[][] {
	const wb = XLSX.read(zip.getEntry(MANIFEST)?.getData(), { type: "buffer" });
	const ws = wb.Sheets[wb.SheetNames[0]];
	// SAFETY: header:1 + raw:false makes every cell a string; defval keeps rows rectangular.
	return XLSX.utils.sheet_to_json(ws, {
		header: 1,
		raw: false,
		defval: "",
	}) as string[][];
}

test.describe("Export Submissions as ZIP", () => {
	test.beforeEach(async ({ page }) => {
		await loginAs(page, ADMIN_USER);
	});

	test("exports TEXT submission with correct content and manifest", async ({
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

		expect(entries).toContain(MANIFEST);
		const txtEntry = entries.find((e) => e.endsWith(".txt"));
		expect(txtEntry).toBeDefined();

		const txtContent = zip.readAsText(txtEntry!);
		expect(txtContent).toBe("My abstract content for export");

		const rows = readManifest(zip);
		expect(rows[0]).toEqual(HEADER);
		const dataRow = findRow(rows, "Export Text Test").join("|");
		expect(dataRow).toContain("Main Author");
		expect(dataRow).toContain("Co Writer");
		expect(dataRow).toContain("keyword1, keyword2");
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
		const titles = readManifest(new AdmZip(buffer))
			.slice(1)
			.map((r) => r[1])
			.join("|");

		expect(titles).toContain("Filter Abstract");
		expect(titles).not.toContain("Filter FullPaper");
	});

	test("manifest has correct header and column count", async ({
		page,
		testRun,
		cleanup,
	}) => {
		const sub = await createSubmission({
			testRunId: testRun.testRunId,
			title: "Manifest Format Test",
			content: "test content",
		});
		cleanup.track(sub.id);

		const response = await page.request.get(
			`/api/admin/submissions/export?search=${testRun.testRunId}`,
		);

		const rows = readManifest(new AdmZip(await response.body()));

		expect(rows[0]).toEqual(HEADER);
		expect(findRow(rows, "Manifest Format Test")).toHaveLength(HEADER.length);
	});
});
