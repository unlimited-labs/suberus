import { test } from "@playwright/test";

export function skipOnMobile(
	testInfo: { project: { name: string } },
	reason = "Desktop-only layout",
) {
	test.skip(testInfo.project.name.includes("mobile"), reason);
}
