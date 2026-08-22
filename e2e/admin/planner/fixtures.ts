import { test as baseAdminTest } from "../fixtures";
import {
	cleanupPlannerForRun,
	createRoom,
	setAppSetting,
	setConferenceDates,
} from "../../helpers/test-db";
import { getDefaultSetting } from "@/features/settings/defaults";
import { ProgramPlannerPage } from "../../pom/program-planner.page";
import { ProgramSettingsPage } from "../../pom/program-settings.page";
import { PublicProgramPage } from "../../pom/public-program.page";

interface PlannerFixtures {
	plannerPage: ProgramPlannerPage;
	programSettingsPage: ProgramSettingsPage;
	publicProgramPage: PublicProgramPage;
	sanityRoomId: string;
}

export const test = baseAdminTest.extend<PlannerFixtures>({
	plannerPage: async ({ page, sanityRoomId }, use) => {
		void sanityRoomId;
		await use(new ProgramPlannerPage(page));
	},
	programSettingsPage: async ({ page }, use) => {
		await use(new ProgramSettingsPage(page));
	},
	publicProgramPage: async ({ page }, use) => {
		await use(new PublicProgramPage(page));
	},
	sanityRoomId: async ({ testRun }, use) => {
		const id = await createRoom(testRun.testRunId, "SanityRoom");
		await use(id);
	},
	testRun: async ({ testRun }, use) => {
		await use(testRun);
		await cleanupPlannerForRun(testRun.testRunId).catch(() => {});
	},
});

export { expect } from "@playwright/test";
export { loginAsAdmin } from "../fixtures";

export function isoDay(offsetDays: number, hour: number): Date {
	const d = new Date();
	d.setUTCDate(d.getUTCDate() + offsetDays);
	d.setUTCHours(hour, 0, 0, 0);
	return d;
}

export async function resetPlannerProgramDefaults(): Promise<void> {
	await setAppSetting("PROGRAM_THEME", "default");
	await setAppSetting("PROGRAM_REMINDER_LEAD_MIN", 5);
	await setAppSetting("PROGRAM_QR", getDefaultSetting("PROGRAM_QR"));
	await setConferenceDates(
		isoDay(0, 0).toISOString(),
		isoDay(30, 23).toISOString(),
	);
}
