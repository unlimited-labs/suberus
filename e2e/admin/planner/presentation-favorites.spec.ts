import { test, expect, isoDay, resetPlannerProgramDefaults } from "./fixtures";
import {
	addPresentationToSession,
	createProgramSession,
	createRoom,
	createSubmission,
	setSchedulePublished,
} from "../../helpers/test-db";

test.describe.serial("Public /program — preview & favorites", () => {
	test.beforeEach(resetPlannerProgramDefaults);

	async function seedPresentation(testRunId: string) {
		const roomId = await createRoom(testRunId, "Fav Room");
		const sessionId = await createProgramSession({
			testRunId,
			title: "Fav Session",
			startAt: isoDay(0, 14),
			endAt: isoDay(0, 15),
			roomId,
		});
		const submission = await createSubmission({
			testRunId,
			title: "Quantum Steel Talk",
			content: "Abstract body about quantum steel deformation under load.",
			authorData: { firstName: "Ada", lastName: "Lovelace" },
			keywords: ["thermodynamics"],
		});
		await addPresentationToSession(sessionId, submission.id);
		await setSchedulePublished(true);
		return { submission };
	}

	test("opens preview dialog with abstract, authors and keywords", async ({
		publicProgramPage,
		testRun,
	}) => {
		const { submission } = await seedPresentation(testRun.testRunId);

		await publicProgramPage.goto();
		await publicProgramPage.openFirstPresentation();

		const preview = publicProgramPage.preview;
		await expect(preview).toContainText(submission.title);
		await expect(preview).toContainText("Ada Lovelace");
		await expect(preview).toContainText("thermodynamics");
		await expect(preview).toContainText("quantum steel deformation");
	});

	test("favorites a presentation and persists across reload", async ({
		publicProgramPage,
		testRun,
	}) => {
		await seedPresentation(testRun.testRunId);

		await publicProgramPage.goto();
		await expect(publicProgramPage.favoritedStars).toHaveCount(0);

		await publicProgramPage.openFirstPresentation();
		await expect(publicProgramPage.favoriteToggle).toHaveText(/Add to favorites/i);
		await publicProgramPage.favoriteToggle.click();
		await expect(publicProgramPage.favoriteToggle).toHaveText(/Favorited/i);

		// star marks the talk on the plan (behind the dialog)
		await expect(publicProgramPage.favoritedStars).toHaveCount(1);

		// survives a full reload (server-persisted)
		await publicProgramPage.goto();
		await expect(publicProgramPage.favoritedStars).toHaveCount(1);

		// un-favorite removes it
		await publicProgramPage.openFirstPresentation();
		await expect(publicProgramPage.favoriteToggle).toHaveText(/Favorited/i);
		await publicProgramPage.favoriteToggle.click();
		await expect(publicProgramPage.favoriteToggle).toHaveText(/Add to favorites/i);
		await expect(publicProgramPage.favoritedStars).toHaveCount(0);
	});
});
