import { test, expect, isoDay } from "./fixtures";
import { baseUrlFor } from "../../../playwright.config";
import { PublicProgramPage } from "../../pom/public-program.page";
import { loginAs } from "../../helpers/auth";
import { DEFAULT_PASSWORD } from "../../helpers/test-users";
import { SubmissionStatus } from "../../../src/generated/prisma/enums";
import {
	addPresentationToSession,
	createProgramSession,
	createRoom,
	createFee,
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

		async function publishTalkWithLinkedAuthor(
			testRunId: string,
			author: {
				firstName: string;
				lastName: string;
				affiliationName: string;
				userId: string;
			},
		) {
			const roomId = await createRoom(testRunId, "Linked Author Room");
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
				extraAuthors: [author],
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
			const author = await createTestUser({
				email: `curie-author-${testRun.testRunId}@e2e.local`,
				firstName: "Maria",
				lastName,
				contactConsent: true,
			});

			try {
				await publishTalkWithLinkedAuthor(testRun.testRunId, {
					firstName: "Maria",
					lastName,
					affiliationName: "Radium Institute",
					userId: author.id,
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
				await expect(page.getByTestId("author-email")).toContainText(
					"@test.com",
				);
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
			} finally {
				await deleteTestUser(author.id).catch(() => {});
			}
		});

		test("shows ORCID link for an author with a linked account", async ({
			publicProgramPage,
			page,
			testRun,
		}) => {
			await setAppSetting("PROGRAM_SHOW_AUTHOR_INFO", true);
			const orcid = "0000-0002-1825-0097";
			const website = "https://example.com/linus";
			const linkedin = "https://www.linkedin.com/in/linus";
			const lastName = `Orcid${testRun.testRunId}`;
			const linkedUser = await createTestUser({
				email: `orcid-author-${testRun.testRunId}@e2e.local`,
				firstName: "Linus",
				lastName,
				contactConsent: true,
			});
			await getPrisma().user.update({
				where: { id: linkedUser.id },
				data: { orcid, website, linkedin },
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
				await expect(page.getByTestId("author-website")).toHaveAttribute(
					"href",
					website,
				);
				await expect(page.getByTestId("author-linkedin")).toHaveAttribute(
					"href",
					linkedin,
				);
			} finally {
				await deleteTestUser(linkedUser.id).catch(() => {});
			}
		});

		test("hides contact details for an author who did not consent", async ({
			publicProgramPage,
			page,
			testRun,
		}) => {
			await setAppSetting("PROGRAM_SHOW_AUTHOR_INFO", true);
			const lastName = `NoConsent${testRun.testRunId}`;
			const author = await createTestUser({
				email: `noconsent-${testRun.testRunId}@e2e.local`,
				firstName: "Rosalind",
				lastName,
				contactConsent: false,
			});
			await createFee({ userId: author.id });

			try {
				await publishTalkWithLinkedAuthor(testRun.testRunId, {
					firstName: "Rosalind",
					lastName,
					affiliationName: "Birkbeck College",
					userId: author.id,
				});

				await publicProgramPage.goto();
				await page
					.getByTestId("author-name")
					.filter({ hasText: lastName })
					.click();

				const authorInfo = page.getByTestId("author-info");
				await expect(authorInfo).toBeVisible();
				await expect(authorInfo).toContainText("Birkbeck College");
				await expect(page.getByTestId("author-email")).toBeHidden();
				await expect(page.getByTestId("author-website")).toBeHidden();
				await expect(page.getByTestId("author-linkedin")).toBeHidden();
			} finally {
				await deleteTestUser(author.id).catch(() => {});
			}
		});

		test("shows contact details for a consenting author who has not paid", async ({
			publicProgramPage,
			page,
			testRun,
		}) => {
			await setAppSetting("PROGRAM_SHOW_AUTHOR_INFO", true);
			const lastName = `NoFee${testRun.testRunId}`;
			const author = await createTestUser({
				email: `nofee-${testRun.testRunId}@e2e.local`,
				firstName: "Rosalind",
				lastName,
				contactConsent: true,
			});

			try {
				await publishTalkWithLinkedAuthor(testRun.testRunId, {
					firstName: "Rosalind",
					lastName,
					affiliationName: "Birkbeck College",
					userId: author.id,
				});

				await publicProgramPage.goto();
				await page
					.getByTestId("author-name")
					.filter({ hasText: lastName })
					.click();

				await expect(page.getByTestId("author-email")).toContainText(
					"@test.com",
				);
			} finally {
				await deleteTestUser(author.id).catch(() => {});
			}
		});

		test("authors are plain text for a signed-in visitor without a paid fee", async ({
			browser,
			testRun,
		}, testInfo) => {
			await setAppSetting("PROGRAM_SHOW_AUTHOR_INFO", true);
			const lastName = `Unpaid${testRun.testRunId}`;
			const author = await createTestUser({
				email: `unpaid-author-${testRun.testRunId}@e2e.local`,
				firstName: "Emmy",
				lastName,
				contactConsent: true,
			});
			const viewer = await createTestUser({
				email: `unpaid-viewer-${testRun.testRunId}@e2e.local`,
				firstName: "Viewer",
				lastName: `Unpaid${testRun.testRunId}`,
			});

			const context = await browser.newContext({
				baseURL: baseUrlFor(testInfo.parallelIndex),
				storageState: { cookies: [], origins: [] },
			});
			const viewerPage = await context.newPage();
			try {
				await publishTalkWithLinkedAuthor(testRun.testRunId, {
					firstName: "Emmy",
					lastName,
					affiliationName: "Gottingen Institute",
					userId: author.id,
				});

				await loginAs(viewerPage, {
					email: viewer.email,
					password: DEFAULT_PASSWORD,
				});
				const viewerProgram = new PublicProgramPage(viewerPage);
				await viewerProgram.goto();
				await expect(
					viewerPage.getByText(`Emmy ${lastName}`).first(),
				).toBeVisible();
				await expect(viewerPage.getByTestId("author-name")).toHaveCount(0);
			} finally {
				await context.close();
				await deleteTestUser(viewer.id).catch(() => {});
				await deleteTestUser(author.id).catch(() => {});
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
	test.describe("search", () => {
		async function publishSearchFixture(testRunId: string) {
			const roomId = await createRoom(testRunId, "Search Room");
			const sessionId = await createProgramSession({
				testRunId,
				title: "Search Session",
				startAt: isoDay(0, 14),
				endAt: isoDay(0, 16),
				roomId,
			});
			for (const [title, lastName] of [
				["Alpha Talk", "Aardvark"],
				["Beta Talk", "Bobcat"],
			]) {
				const submission = await createSubmission({
					testRunId,
					title,
					status: SubmissionStatus.ACCEPTED,
					authorData: { firstName: "Ann", lastName: `${testRunId}_${lastName}` },
				});
				await addPresentationToSession(sessionId, submission.id, {
					durationMin: 30,
				});
			}

			const laterSessionId = await createProgramSession({
				testRunId,
				title: "Later Session",
				startAt: isoDay(1, 14),
				endAt: isoDay(1, 15),
				roomId,
			});
			const later = await createSubmission({
				testRunId,
				title: "Gamma Talk",
				status: SubmissionStatus.ACCEPTED,
			});
			await addPresentationToSession(laterSessionId, later.id);
			await setSchedulePublished(true);
		}

		test("keeps the session header, lists only matching talks at their real time", async ({
			publicProgramPage,
			page,
			testRun,
		}) => {
			await publishSearchFixture(testRun.testRunId);
			await publicProgramPage.goto();

			const row = (title: string) =>
				page
					.getByTestId("presentation-row")
					.filter({ hasText: `${testRun.testRunId}_${title}` });
			const alphaRow = row("Alpha Talk");
			const betaRow = row("Beta Talk");
			await expect(betaRow).toBeVisible({ timeout: 10000 });

			await publicProgramPage.searchFor(
				`${testRun.testRunId}_Bobcat`,
				alphaRow,
				"hidden",
			);

			await expect(
				page.getByText(`${testRun.testRunId}_Search Session`).first(),
			).toBeVisible();
			await expect(betaRow).toBeVisible();
			const filteredTime = (await betaRow.innerText()).match(
				/\d{1,2}:\d{2}/,
			)?.[0];
			expect(filteredTime).toBeTruthy();

			await publicProgramPage.search.fill("");
			await expect(alphaRow).toBeVisible();
			await expect(betaRow).toContainText(String(filteredTime));
		});

		test("flags matches on another day and jumps there", async ({
			publicProgramPage,
			page,
			testRun,
		}) => {
			await publishSearchFixture(testRun.testRunId);
			await publicProgramPage.goto();

			await publicProgramPage.searchFor(
				`${testRun.testRunId}_Gamma`,
				page.getByTestId("program-search-notice"),
				"visible",
			);

			await expect(page.getByTestId("day-match-count-1")).toHaveText("1");

			await page.getByRole("button", { name: /^Go to / }).click();

			await expect(page.getByTestId("program-search-notice")).toBeHidden();
			await expect(page.getByTestId("presentation-row")).toHaveCount(1);
			await expect(
				page.getByText(`${testRun.testRunId}_Gamma Talk`).first(),
			).toBeVisible();
		});

		test("grid theme shows the same day hint and jump", async ({
			publicProgramPage,
			page,
			testRun,
		}) => {
			await setAppSetting("PROGRAM_THEME", "academic");
			try {
				await publishSearchFixture(testRun.testRunId);
				await publicProgramPage.goto();

				await publicProgramPage.searchFor(
					`${testRun.testRunId}_Gamma`,
					page.getByTestId("program-search-notice"),
					"visible",
				);

				await expect(page.getByTestId("day-match-count-1")).toHaveText("1");
				await page.getByRole("button", { name: /^Go to / }).click();

				await expect(page.getByTestId("program-search-notice")).toBeHidden();
				await expect(
					page.getByText(`${testRun.testRunId}_Gamma Talk`).first(),
				).toBeVisible();
			} finally {
				await setAppSetting("PROGRAM_THEME", "default");
			}
		});
	});
	test.describe("participant list", () => {
		test.afterEach(async () => {
			await setAppSetting("PROGRAM_SHOW_AUTHOR_INFO", false);
		});

		test("lists paid participants, gates contact details on consent, filters by search", async ({
			publicProgramPage,
			page,
			testRun,
		}) => {
			await setAppSetting("PROGRAM_SHOW_AUTHOR_INFO", true);
			await setSchedulePublished(true);
			const consentName = `Consented${testRun.testRunId}`;
			const silentName = `Silent${testRun.testRunId}`;
			const consented = await createTestUser({
				email: `list-consented-${testRun.testRunId}@e2e.local`,
				firstName: "Ada",
				lastName: consentName,
				contactConsent: true,
			});
			await createFee({ userId: consented.id });
			const consentedWebsite = "https://example.com/ada";
			await getPrisma().user.update({
				where: { id: consented.id },
				data: { website: consentedWebsite },
			});
			const silent = await createTestUser({
				email: `list-silent-${testRun.testRunId}@e2e.local`,
				firstName: "Grace",
				lastName: silentName,
				contactConsent: false,
			});
			await createFee({ userId: silent.id });

			try {
				await publicProgramPage.goto();
				await page.getByTestId("program-participants-link").click();
				await expect(page).toHaveURL(/\/program\/participants$/);

				const consentedCard = page
					.getByTestId("participant-card-button")
					.filter({ hasText: consentName });
				await expect(consentedCard).toBeVisible();
				await expect(
					page.getByTestId("participant-card").filter({ hasText: silentName }),
				).toBeVisible();
				await expect(
					page
						.getByTestId("participant-card-button")
						.filter({ hasText: silentName }),
				).toHaveCount(0);
				await expect(page.getByText(silent.email)).toHaveCount(0);

				await consentedCard.click();
				await expect(page.getByTestId("participant-details")).toBeVisible();
				await expect(page.getByTestId("author-email")).toContainText(
					consented.email,
				);
				await expect(page.getByTestId("author-website")).toHaveAttribute(
					"href",
					consentedWebsite,
				);
				await page.keyboard.press("Escape");

				await page.getByPlaceholder(/Search participants/i).fill(consentName);
				await expect(consentedCard).toBeVisible();
				await expect(
					page.getByTestId("participant-card").filter({ hasText: silentName }),
				).toHaveCount(0);
			} finally {
				await deleteTestUser(consented.id).catch(() => {});
				await deleteTestUser(silent.id).catch(() => {});
			}
		});

		test("anonymous visitors get no link and are sent to sign-in", async ({
			browser,
		}, testInfo) => {
			await setAppSetting("PROGRAM_SHOW_AUTHOR_INFO", true);
			await setSchedulePublished(true);

			const context = await browser.newContext({
				baseURL: baseUrlFor(testInfo.parallelIndex),
				storageState: { cookies: [], origins: [] },
			});
			const anonPage = await context.newPage();
			try {
				await new PublicProgramPage(anonPage).goto();
				await expect(
					anonPage.getByTestId("program-participants-link"),
				).toHaveCount(0);

				await anonPage.goto("/program/participants");
				await expect(anonPage).toHaveURL(/\/login/);
			} finally {
				await context.close();
			}
		});

		test("signed-in visitor without a paid fee is sent back to the programme", async ({
			browser,
			testRun,
		}, testInfo) => {
			await setAppSetting("PROGRAM_SHOW_AUTHOR_INFO", true);
			await setSchedulePublished(true);
			const viewer = await createTestUser({
				email: `list-unpaid-${testRun.testRunId}@e2e.local`,
				firstName: "Viewer",
				lastName: `Unpaid${testRun.testRunId}`,
			});

			const context = await browser.newContext({
				baseURL: baseUrlFor(testInfo.parallelIndex),
				storageState: { cookies: [], origins: [] },
			});
			const viewerPage = await context.newPage();
			try {
				await loginAs(viewerPage, {
					email: viewer.email,
					password: DEFAULT_PASSWORD,
				});
				await new PublicProgramPage(viewerPage).goto();
				await expect(
					viewerPage.getByTestId("program-participants-link"),
				).toHaveCount(0);

				await viewerPage.goto("/program/participants");
				await expect(viewerPage).toHaveURL(/\/program$/);
			} finally {
				await context.close();
				await deleteTestUser(viewer.id).catch(() => {});
			}
		});
	});
});
