import { randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import { expect, test } from "../helpers/base-fixtures";
import { getPrisma } from "../helpers/test-db";

test.use({
	launchOptions: { args: ["--disable-gpu", "--enable-features=WebMCP"] },
});

async function runTool(page: Page, name: string, input: object) {
	return page.evaluate(
		async ([toolName, toolInput]) => {
			const context = document.modelContext;
			if (!context) throw new Error("WebMCP is not enabled");
			const tool = (await context.getTools()).find((t) => t.name === toolName);
			if (!tool) throw new Error(`${toolName} is not registered`);
			return context.executeTool(tool, toolInput);
		},
		[name, input] as const,
	);
}

// The tools only fill and open the dialog; the admin's click is what submits.
test.describe("WebMCP admin tools", () => {
	test("prepare-invitation fills the dialog without sending", async ({
		page,
	}) => {
		const email = `webmcp-${randomUUID().slice(0, 8)}@e2e-test.local`;
		await page.goto("/admin/invitations");
		await expect(page.getByRole("heading", { name: "Invitations" })).toBeVisible();

		await expect
			.poll(() =>
				runTool(page, "prepare-invitation", { email, role: "EDITOR" }).catch(
					(error: Error) => error.message,
				),
			)
			.toContain("Nothing is sent");

		const dialog = page.getByRole("dialog");
		await expect(dialog.getByLabel("Email")).toHaveValue(email);
		await expect(dialog.getByRole("combobox")).toHaveText("Editor");
		expect(await getPrisma().invitation.count({ where: { email } })).toBe(0);
	});

	test("prepare-track rejects an unknown supervisor", async ({ page }) => {
		await page.goto("/admin/settings?tab=tracks");
		await expect(page.getByRole("button", { name: "Create Track" })).toBeVisible();

		await expect
			.poll(() =>
				runTool(page, "prepare-track", {
					name: "WebMCP track",
					supervisorEmail: "nobody@e2e-test.local",
				}).catch((error: Error) => error.message),
			)
			.toContain("No reviewer with email nobody@e2e-test.local");
		await expect(page.getByRole("dialog")).toBeHidden();
	});
});
