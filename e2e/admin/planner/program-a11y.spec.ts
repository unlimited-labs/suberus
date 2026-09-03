import AxeBuilder from "@axe-core/playwright";
import { expect, isoDay, test } from "./fixtures";
import {
	createProgramSession,
	createRoom,
	setAppSetting,
	setConferenceDates,
	setSchedulePublished,
} from "../../helpers/test-db";

const THEMES = ["default", "editorial", "crimson", "academic"] as const;

test.describe.serial("Public /program accessibility", () => {
	test.beforeEach(async () => {
		await setConferenceDates(
			isoDay(0, 0).toISOString(),
			isoDay(30, 23).toISOString(),
		);
	});

	for (const theme of THEMES) {
		test(`${theme} theme has no axe violations`, async ({
			publicProgramPage,
			page,
			testRun,
		}) => {
			await setAppSetting("PROGRAM_THEME", theme);
			const roomId = await createRoom(testRun.testRunId, `A11y ${theme}`);
			await createProgramSession({
				testRunId: testRun.testRunId,
				title: `A11y ${theme}`,
				startAt: isoDay(0, 14),
				endAt: isoDay(0, 15),
				roomId,
			});
			await setSchedulePublished(true);

			for (const colorScheme of ["light", "dark"] as const) {
				await page.emulateMedia({ colorScheme });
				await publicProgramPage.goto();
				const { violations } = await new AxeBuilder({ page })
					.withTags(["wcag2a", "wcag2aa", "wcag21aa"])
					.analyze();
				expect(
					violations.map((v) => `${v.id} (${v.nodes.length})`),
					`${theme} / ${colorScheme}`,
				).toEqual([]);
			}
		});
	}
});
