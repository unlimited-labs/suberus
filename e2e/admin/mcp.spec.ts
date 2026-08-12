import { randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import { expect, test } from "../helpers/base-fixtures";
import { getPrisma } from "../helpers/test-db";
import { ADMIN_USER } from "../helpers/test-users";

const CALLBACK = "http://127.0.0.1:9999/callback";
const DESKTOP_PREFIX = "suberus-desktop-";

async function clearDesktopClients() {
	const db = getPrisma();
	const where = { clientId: { startsWith: DESKTOP_PREFIX } };
	await db.oauthClientResource.deleteMany({ where });
	await db.oauthClient.deleteMany({ where });
}

async function openMcpDialog(page: Page) {
	await page.goto("/");

	// Each step gates on the element it actually needs, never on role="dialog":
	// the Base UI sheet/menu popups do not set it. Clicks are retried because one
	// landing before hydration is silently swallowed.
	const userMenu = page.locator('[data-testid="user-menu-trigger"]:visible');
	// getByRole, not a testid: data-testid does not survive the SheetTrigger
	// asChild composition on this button (branding-settings.spec.ts uses the same
	// accessible name for the same reason).
	const mobileNav = page.getByRole("button", { name: "Menu" });
	// The app shows a full-screen spinner until the session resolves. isVisible()
	// does not retry, so branching before the shell renders would silently take
	// the desktop path on a phone.
	await expect(mobileNav.or(userMenu).first()).toBeVisible();
	if (await mobileNav.isVisible()) {
		await expect(async () => {
			if (!(await userMenu.isVisible())) await mobileNav.click();
			await expect(userMenu).toBeVisible({ timeout: 1000 });
		}).toPass({ timeout: 15_000 });
	}

	const mcpItem = page.getByTestId("user-menu-mcp");
	await expect(async () => {
		if (!(await mcpItem.isVisible())) await userMenu.click();
		await expect(mcpItem).toBeVisible({ timeout: 1000 });
	}).toPass({ timeout: 15_000 });

	await mcpItem.click();
	await expect(page.getByTestId("mcp-connect-dialog")).toBeVisible();
}

test.describe("MCP — connect dialog", () => {
	// Minting is idempotent per user, so a client left behind by one test would
	// change what the next one sees in the command.
	test.beforeEach(clearDesktopClients);
	test.afterEach(clearDesktopClients);

	test("offers the server URL and the register command", async ({ page }) => {
		await openMcpDialog(page);

		const dialog = page.getByTestId("mcp-connect-dialog");
		await expect(dialog.getByTestId("mcp-copy-1")).toContainText(
			"claude mcp add --transport http",
		);
		await expect(dialog.getByTestId("mcp-copy-2")).toContainText("/api/mcp");
	});

	test("mints credentials and folds them into the command", async ({
		page,
	}) => {
		const db = getPrisma();
		await openMcpDialog(page);

		const dialog = page.getByTestId("mcp-connect-dialog");
		await expect(dialog.getByTestId("mcp-copy-1")).not.toContainText(
			"--client-id",
		);

		await dialog.getByTestId("mcp-callback-port").fill("8123");
		await dialog.getByTestId("mcp-mint-client").click();

		await expect(dialog.getByTestId("mcp-client-id")).toContainText(
			"suberus-desktop-",
		);
		const clientId = (await dialog.getByTestId("mcp-client-id").innerText())
			.trim();
		await expect(dialog.getByTestId("mcp-copy-1")).toContainText(
			`--client-id ${clientId} --callback-port 8123`,
		);

		// The row is only usable if it carries the loopback DNS callback Claude
		// Code sends and the link to this instance's MCP resource.
		const client = await db.oauthClient.findUnique({ where: { clientId } });
		expect(client?.redirectUris).toEqual(["http://localhost:8123/callback"]);
		expect(client?.requirePKCE).toBe(true);
		expect(client?.tokenEndpointAuthMethod).toBe("none");
		expect(await db.oauthClientResource.count({ where: { clientId } })).toBe(1);
	});

	test("keeps its content inside the dialog", async ({ page }) => {
		await openMcpDialog(page);

		// The register command is a single nowrap line; it used to widen the
		// dialog's grid track and push every child past the right edge.
		const overflow = await page
			.getByTestId("mcp-connect-dialog")
			.evaluate((el) => el.scrollWidth - el.clientWidth);
		expect(overflow).toBeLessThanOrEqual(0);
	});
});

test.describe("MCP — consent screen", () => {
	const clientId = `https://client-${randomUUID().slice(0, 8)}.example/doc.json`;

	test.afterEach(async () => {
		const db = getPrisma();
		await db.oauthConsent.deleteMany({ where: { clientId } });
		await db.oauthClientResource.deleteMany({ where: { clientId } });
		await db.oauthClient.deleteMany({ where: { clientId } });
	});

	async function seedClient(page: Page) {
		const db = getPrisma();
		const resource = `${new URL(page.url() || "http://localhost").origin}/api/mcp`;
		await db.oauthClient.create({
			data: {
				clientId,
				name: "E2E assistant",
				redirectUris: [CALLBACK],
				grantTypes: ["authorization_code"],
				responseTypes: ["code"],
				tokenEndpointAuthMethod: "none",
				scopes: ["openid", "profile", "email"],
				requirePKCE: true,
			},
		});
		await db.oauthClientResource
			.create({ data: { clientId, resourceId: resource } })
			.catch(() => undefined);
		return resource;
	}

	function authorizeUrl(resource: string) {
		const params = new URLSearchParams({
			response_type: "code",
			client_id: clientId,
			redirect_uri: CALLBACK,
			scope: "openid profile email",
			state: "e2e-state",
			code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
			code_challenge_method: "S256",
			resource,
		});
		return `/api/auth/oauth2/authorize?${params}`;
	}

	test("names the application and the account it will act as", async ({
		page,
	}) => {
		await page.goto("/");
		const resource = await seedClient(page);

		await page.goto(authorizeUrl(resource));

		await expect(page).toHaveURL(/\/consent\?/);
		await expect(page.getByTestId("consent-client")).toContainText(
			"E2E assistant",
		);
		await expect(page.getByTestId("consent-card")).toContainText(
			ADMIN_USER.email,
		);
		await expect(page.getByTestId("consent-card")).toContainText(
			"Confirm who you are",
		);
	});

	test("approving hands an authorization code to the client", async ({
		page,
	}) => {
		await page.route(`${CALLBACK}*`, (route) =>
			route.fulfill({ status: 200, body: "callback" }),
		);
		await page.goto("/");
		const resource = await seedClient(page);

		await page.goto(authorizeUrl(resource));
		await page.getByTestId("consent-approve").click();

		await page.waitForURL(/127\.0\.0\.1:9999\/callback\?/);
		const url = new URL(page.url());
		expect(url.searchParams.get("code")).toBeTruthy();
		expect(url.searchParams.get("state")).toBe("e2e-state");
	});

	test("denying returns an error instead of a code", async ({ page }) => {
		await page.route(`${CALLBACK}*`, (route) =>
			route.fulfill({ status: 200, body: "callback" }),
		);
		await page.goto("/");
		const resource = await seedClient(page);

		await page.goto(authorizeUrl(resource));
		await page.getByTestId("consent-deny").click();

		await page.waitForURL(/127\.0\.0\.1:9999\/callback\?/);
		const url = new URL(page.url());
		expect(url.searchParams.get("code")).toBeNull();
		expect(url.searchParams.get("error")).toBeTruthy();
	});
});
