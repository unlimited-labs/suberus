import { test, expect, isoDay } from "./fixtures";
import { baseUrlFor } from "../../../playwright.config";
import { PublicProgramPage } from "../../pom/public-program.page";
import { SubmissionStatus } from "../../../src/generated/prisma/enums";
import {
	addPresentationToSession,
	createProgramSession,
	createRoom,
	createSubmission,
	createTestUser,
	deleteTestUser,
	getPrisma,
	setAppSetting,
	setConferenceDates,
	setSchedulePublished,
} from "../../helpers/test-db";

test.describe.serial("Public /program", () => {
	test.beforeEach(async () => {
		await setConferenceDates(
			isoDay(0, 0).toISOString(),
			isoDay(30, 23).toISOString(),
		);
	});

	test("shows published sessions to anonymous users", async ({
		publicProgramPage,
		testRun,
	}) => {
		const roomId = await createRoom(testRun.testRunId, "Public Room");
		await createProgramSession({
			testRunId: testRun.testRunId,
			title: "Keynote Alpha",
			startAt: isoDay(0, 14),
			endAt: isoDay(0, 15),
			roomId,
		});
		await setSchedulePublished(true);

		await publicProgramPage.goto();
		await expect(
			publicProgramPage.sessionByTitle(
				`${testRun.testRunId}_Keynote Alpha`,
			).first(),
		).toBeVisible({ timeout: 10000 });
	});

	test("hides unpublished schedule", async ({ page, testRun }) => {
		const roomId = await createRoom(testRun.testRunId, "Draft Room");
		await createProgramSession({
			testRunId: testRun.testRunId,
			title: "Draft Session",
			startAt: isoDay(0, 14),
			endAt: isoDay(0, 15),
			roomId,
		});
		await setSchedulePublished(false);

		await page.goto("/program");
		await expect(
			page.getByText(`${testRun.testRunId}_Draft Session`),
		).toBeHidden();
	});

	test.describe("themes", () => {
		test.afterEach(async () => {
			await setAppSetting("PROGRAM_THEME", "default");
		});

		async function publishOneSession(testRunId: string, title: string) {
			const roomId = await createRoom(testRunId, `Room ${title}`);
			await createProgramSession({
				testRunId,
				title,
				startAt: isoDay(0, 14),
				endAt: isoDay(0, 15),
				roomId,
			});
			await setSchedulePublished(true);
		}

		test("default theme renders, editorial markers absent", async ({
			publicProgramPage,
			page,
			testRun,
		}) => {
			await setAppSetting("PROGRAM_THEME", "default");
			await publishOneSession(testRun.testRunId, "Theme Default Talk");

			await publicProgramPage.goto();
			await expect(page.getByTestId("program-theme-default")).toBeVisible();
			await expect(page.getByTestId("program-theme-editorial")).toBeHidden();
			await expect(publicProgramPage.ribbon).toBeHidden();
		});

		test("editorial theme renders when selected", async ({
			publicProgramPage,
			page,
			testRun,
		}) => {
			await setAppSetting("PROGRAM_THEME", "editorial");
			await publishOneSession(testRun.testRunId, "Theme Editorial Talk");

			await publicProgramPage.goto();
			await expect(page.getByTestId("program-theme-editorial")).toBeVisible();
			await expect(page.getByTestId("program-theme-default")).toBeHidden();
			await expect(publicProgramPage.ribbon).toBeVisible();
		});

		test("crimson theme renders when selected", async ({
			publicProgramPage,
			page,
			testRun,
		}) => {
			await setAppSetting("PROGRAM_THEME", "crimson");
			await publishOneSession(testRun.testRunId, "Theme Crimson Talk");

			await publicProgramPage.goto();
			await expect(page.getByTestId("program-theme-crimson")).toBeVisible();
			await expect(page.getByTestId("program-theme-default")).toBeHidden();
			await expect(publicProgramPage.ribbon).toBeHidden();
		});

		test("academic theme renders when selected", async ({
			publicProgramPage,
			page,
			testRun,
		}) => {
			await setAppSetting("PROGRAM_THEME", "academic");
			await publishOneSession(testRun.testRunId, "Theme Academic Talk");

			await publicProgramPage.goto();
			await expect(page.getByTestId("program-theme-academic")).toBeVisible();
			await expect(page.getByTestId("program-theme-default")).toBeHidden();
			await expect(
				page.getByText(/Conference Programme/i).first(),
			).toBeVisible();
		});
	});

	test.describe("author info", () => {
		test.afterEach(async () => {
			await setAppSetting("PROGRAM_SHOW_AUTHOR_INFO", false);
		});

		async function publishTalkWithAuthor(
			testRunId: string,
			author: { firstName: string; lastName: string; affiliationName: string },
		) {
			const roomId = await createRoom(testRunId, "Author Info Room");
			const sessionId = await createProgramSession({
				testRunId,
				title: "Author Info Session",
				startAt: isoDay(0, 14),
				endAt: isoDay(0, 15),
				roomId,
			});
			const submission = await createSubmission({
				testRunId,
				title: "Author Info Talk",
				status: SubmissionStatus.ACCEPTED,
				authorData: author,
			});
			await addPresentationToSession(sessionId, submission.id);
			await setSchedulePublished(true);
		}

		test("author click opens author view, back returns to talk", async ({
			publicProgramPage,
			page,
			testRun,
		}) => {
			await setAppSetting("PROGRAM_SHOW_AUTHOR_INFO", true);
			const lastName = `Curie${testRun.testRunId}`;
			await publishTalkWithAuthor(testRun.testRunId, {
				firstName: "Maria",
				lastName,
				affiliationName: "Radium Institute",
			});

			await publicProgramPage.goto();
			await page
				.getByTestId("author-name")
				.filter({ hasText: lastName })
				.click();

			const authorInfo = page.getByTestId("author-info");
			await expect(authorInfo).toBeVisible();
			await expect(authorInfo).toContainText(`Maria ${lastName}`);
			await expect(authorInfo).toContainText("Radium Institute");
			await expect(page.getByTestId("author-email")).toContainText("@test.com");
			await expect(page.getByTestId("author-orcid")).toBeHidden();

			await page.getByTestId("author-back").click();
			await expect(authorInfo).toBeHidden();
			await expect(publicProgramPage.preview).toContainText(
				`${testRun.testRunId}_Author Info Talk`,
			);

			await page
				.getByTestId("author-card-button")
				.filter({ hasText: lastName })
				.click();
			await expect(authorInfo).toBeVisible();
		});

		test("shows ORCID link for an author with a linked account", async ({
			publicProgramPage,
			page,
			testRun,
		}) => {
			await setAppSetting("PROGRAM_SHOW_AUTHOR_INFO", true);
			const orcid = "0000-0002-1825-0097";
			const lastName = `Orcid${testRun.testRunId}`;
			const linkedUser = await createTestUser({
				email: `orcid-author-${testRun.testRunId}@e2e.local`,
				firstName: "Linus",
				lastName,
			});
			await getPrisma().user.update({
				where: { id: linkedUser.id },
				data: { orcid },
			});

			try {
				const roomId = await createRoom(testRun.testRunId, "ORCID Room");
				const sessionId = await createProgramSession({
					testRunId: testRun.testRunId,
					title: "ORCID Talk",
					startAt: isoDay(0, 14),
					endAt: isoDay(0, 15),
					roomId,
				});
				const submission = await createSubmission({
					testRunId: testRun.testRunId,
					title: "ORCID Talk",
					status: SubmissionStatus.ACCEPTED,
					extraAuthors: [
						{
							firstName: "Linus",
							lastName,
							affiliationName: "Kernel Institute",
							userId: linkedUser.id,
						},
					],
				});
				await addPresentationToSession(sessionId, submission.id);
				await setSchedulePublished(true);

				await publicProgramPage.goto();
				await page
					.getByTestId("author-name")
					.filter({ hasText: lastName })
					.click();

				const orcidLink = page.getByTestId("author-orcid");
				await expect(orcidLink).toBeVisible();
				await expect(orcidLink).toContainText(orcid);
				await expect(orcidLink).toHaveAttribute(
					"href",
					`https://orcid.org/${orcid}`,
				);
			} finally {
				await deleteTestUser(linkedUser.id).catch(() => {});
			}
		});

		test("authors are plain text for anonymous visitors even when enabled", async ({
			browser,
			testRun,
		}, testInfo) => {
			await setAppSetting("PROGRAM_SHOW_AUTHOR_INFO", true);
			const lastName = `Anon${testRun.testRunId}`;
			await publishTalkWithAuthor(testRun.testRunId, {
				firstName: "Grace",
				lastName,
				affiliationName: "Harvard Computation Lab",
			});

			const context = await browser.newContext({
				baseURL: baseUrlFor(testInfo.parallelIndex),
				storageState: { cookies: [], origins: [] },
			});
			const anonPage = await context.newPage();
			try {
				const anonProgram = new PublicProgramPage(anonPage);
				await anonProgram.goto();
				await expect(
					anonPage.getByText(`Grace ${lastName}`).first(),
				).toBeVisible();
				await expect(anonPage.getByTestId("author-name")).toHaveCount(0);

				await anonPage
					.getByTestId("presentation-row")
					.filter({ hasText: lastName })
					.click();
				await expect(anonProgram.preview).toBeVisible();
				await expect(anonPage.getByTestId("author-card-button")).toHaveCount(0);
			} finally {
				await context.close();
			}
		});

		test("authors are plain text when disabled", async ({
			publicProgramPage,
			page,
			testRun,
		}) => {
			const lastName = `Plain${testRun.testRunId}`;
			await publishTalkWithAuthor(testRun.testRunId, {
				firstName: "Ada",
				lastName,
				affiliationName: "Analytical Society",
			});

			await publicProgramPage.goto();
			await expect(page.getByText(`Ada ${lastName}`).first()).toBeVisible();
			await expect(page.getByTestId("author-name")).toHaveCount(0);

			await page
				.getByTestId("presentation-row")
				.filter({ hasText: lastName })
				.click();
			await expect(publicProgramPage.preview).toBeVisible();
			await expect(page.getByTestId("author-card-button")).toHaveCount(0);
		});
	});
});
