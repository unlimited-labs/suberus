import { test as baseAdminTest } from "../fixtures";
import {
	cleanupPlannerForRun,
	createRoom,
	setAppSetting,
	setConferenceDates,
} from "../../helpers/test-db";
import { ProgramPlannerPage } from "../../pom/program-planner.page";
import { ProgramSettingsPage } from "../../pom/program-settings.page";
import { PublicProgramPage } from "../../pom/public-program.page";

interface PlannerFixtures {
	plannerPage: ProgramPlannerPage;
	programSettingsPage: ProgramSettingsPage;
	publicProgramPage: PublicProgramPage;
	/** Ensure at least one room exists so the planner grid renders (not the "no rooms" placeholder). */
	sanityRoomId: string;
}

export const test = baseAdminTest.extend<PlannerFixtures>({
	plannerPage: async ({ page, sanityRoomId }, use) => {
		// depend on sanityRoomId so the planner always has at least one room
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
		// Planner-specific cleanup after each test
		await cleanupPlannerForRun(testRun.testRunId).catch(() => {});
	},
});

export { expect } from "@playwright/test";
export { loginAsAdmin } from "../fixtures";

/** UTC date `offsetDays` from today, snapped to `hour:00:00`. */
export function isoDay(offsetDays: number, hour: number): Date {
	const d = new Date();
	d.setUTCDate(d.getUTCDate() + offsetDays);
	d.setUTCHours(hour, 0, 0, 0);
	return d;
}

/** Default-theme program with a 31-day conference window — shared spec setup. */
export async function resetPlannerProgramDefaults(): Promise<void> {
	await setAppSetting("PROGRAM_THEME", "default");
	await setAppSetting("PROGRAM_REMINDER_LEAD_MIN", 5);
	await setConferenceDates(
		isoDay(0, 0).toISOString(),
		isoDay(30, 23).toISOString(),
	);
}
