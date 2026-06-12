import { test } from "@playwright/test";

/** Skip the current test (or hook) on mobile projects that lack desktop-only affordances. */
export function skipOnMobile(
	testInfo: { project: { name: string } },
	reason = "Desktop-only layout",
) {
	test.skip(testInfo.project.name.includes("mobile"), reason);
}
