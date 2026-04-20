import { test as baseAdminTest } from "../fixtures";
import { cleanupPlannerForRun } from "../../helpers/test-db";
import { ProgramPlannerPage } from "../../pom/program-planner.page";
import { ProgramSettingsPage } from "../../pom/program-settings.page";
import { PublicProgramPage } from "../../pom/public-program.page";

interface PlannerFixtures {
	plannerPage: ProgramPlannerPage;
	programSettingsPage: ProgramSettingsPage;
	publicProgramPage: PublicProgramPage;
}

export const test = baseAdminTest.extend<PlannerFixtures>({
	plannerPage: async ({ page }, use) => {
		await use(new ProgramPlannerPage(page));
	},
	programSettingsPage: async ({ page }, use) => {
		await use(new ProgramSettingsPage(page));
	},
	publicProgramPage: async ({ page }, use) => {
		await use(new PublicProgramPage(page));
	},
	testRun: async ({ testRun }, use) => {
		await use(testRun);
		// Planner-specific cleanup after each test
		await cleanupPlannerForRun(testRun.testRunId).catch(() => {});
	},
});

export { expect } from "@playwright/test";
export { loginAsAdmin } from "../fixtures";
