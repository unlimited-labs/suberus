import { randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import { expect, test } from "../helpers/base-fixtures";
import { getPrisma } from "../helpers/test-db";
import { ADMIN_USER } from "../helpers/test-users";

const CALLBACK = "http://127.0.0.1:9999/callback";
const DESKTOP_PREFIX = "suberus-desktop-";
const DEFAULT_PORT = 8080;

async function clearDesktopClients() {
	const db = getPrisma();
	const where = { clientId: { startsWith: DESKTOP_PREFIX } };
	await db.oauthClientResource.deleteMany({ where });
	await db.oauthClient.deleteMany({ where });
}

async function openMcpDialog(page: Page) {
	await page.goto("/");

	// Never gate on role="dialog" — Base UI popups omit it. Clicks are retried
	// because one landing before hydration is silently swallowed.
	const userMenu = page.locator('[data-testid="user-menu-trigger"]:visible');
	// getByRole: data-testid does not survive SheetTrigger's asChild composition.
	const mobileNav = page.getByRole("button", { name: "Menu" });
	// isVisible() does not retry, so branching before the session spinner clears
	// would silently take the desktop path on a phone.
	await expect(mobileNav.or(userMenu).first()).toBeVisible();
	if (await mobileNav.isVisible()) {
		await expect(async () => {
			if (!(await userMenu.isVisible())) await mobileNav.click();
			await expect(userMenu).toBeVisible({ timeout: 1000 });
		}).toPass({ timeout: 15_000 });
	}

	// Wait for the entry separately: it renders only once the connection query
	// answers, and re-clicking an open menu would toggle it shut.
	const menu = page.getByTestId("user-menu-content");
	await expect(async () => {
		if (!(await menu.isVisible())) await userMenu.click();
		await expect(menu).toBeVisible({ timeout: 1000 });
	}).toPass({ timeout: 15_000 });

	const mcpItem = page.getByTestId("user-menu-mcp");
	await expect(mcpItem).toBeVisible({ timeout: 15_000 });
	await mcpItem.click();
	await expect(page.getByTestId("mcp-connect-dialog")).toBeVisible();
}

test.describe("MCP — connect dialog", () => {
	// Minting is idempotent per user: a leftover client changes the next test.
	test.beforeEach(clearDesktopClients);
	test.afterEach(clearDesktopClients);

	test("offers the server URL and the register command", async ({ page }) => {
		await openMcpDialog(page);

		const dialog = page.getByTestId("mcp-connect-dialog");
		await expect(dialog.getByTestId("mcp-copy-1")).toContainText(
			"claude mcp add --scope project --transport http",
		);
		await expect(dialog.getByTestId("mcp-copy-2")).toContainText("/api/mcp");
	});

	test("issues credentials on open and folds them into the command", async ({
		page,
	}) => {
		const db = getPrisma();
		await openMcpDialog(page);

		const dialog = page.getByTestId("mcp-connect-dialog");
		await expect(dialog.getByTestId("mcp-client-id")).toContainText(
			"suberus-desktop-",
		);
		const clientId = (
			await dialog.getByTestId("mcp-client-id").innerText()
		).trim();
		await expect(dialog.getByTestId("mcp-copy-1")).toContainText(
			`--client-id ${clientId}`,
		);
		await expect(dialog.getByTestId("mcp-copy-1")).toContainText(
			"--scope project",
		);

		// Usable only with the loopback DNS callback Claude Code sends.
		const client = await db.oauthClient.findUnique({ where: { clientId } });
		expect(client?.redirectUris).toEqual([
			`http://localhost:${DEFAULT_PORT}/callback`,
		]);
		expect(client?.requirePKCE).toBe(true);
		expect(client?.tokenEndpointAuthMethod).toBe("none");
		expect(await db.oauthClientResource.count({ where: { clientId } })).toBe(1);
	});

	test("re-issues on a different port", async ({ page }) => {
		await openMcpDialog(page);
		const dialog = page.getByTestId("mcp-connect-dialog");
		await expect(dialog.getByTestId("mcp-client-id")).toBeVisible();

		await dialog.getByTestId("mcp-callback-port").fill("8123");
		await dialog.getByTestId("mcp-mint-client").click();

		await expect(dialog.getByTestId("mcp-copy-1")).toContainText(
			"--callback-port 8123",
		);
	});

	test("revokes an application from the authorized list", async ({ page }) => {
		const db = getPrisma();
		const clientId = `${DESKTOP_PREFIX}revoke-${randomUUID().slice(0, 8)}`;
		const admin = await db.user.findUnique({
			where: { email: ADMIN_USER.email },
		});
		if (!admin) throw new Error("admin user not found");

		await page.goto("/");
		const resource = `${new URL(page.url()).origin}/api/mcp`;
		await db.oauthClient.create({
			data: {
				clientId,
				userId: admin.id,
				name: "Revocable assistant",
				redirectUris: ["http://localhost:8080/callback"],
				grantTypes: ["authorization_code"],
				responseTypes: ["code"],
				tokenEndpointAuthMethod: "none",
				scopes: ["users:read"],
				requirePKCE: true,
			},
		});
		await db.oauthConsent.create({
			data: {
				clientId,
				userId: admin.id,
				scopes: ["users:read"],
				resources: [resource],
				createdAt: new Date(),
			},
		});

		await openMcpDialog(page);
		const row = page
			.getByTestId("mcp-client-list")
			.locator("li")
			.filter({ hasText: "Revocable assistant" });
		await expect(row).toBeVisible();

		await row.getByTestId("mcp-remove-client").click();

		await expect(row).toBeHidden();
		expect(await db.oauthConsent.count({ where: { clientId } })).toBe(0);
		expect(await db.oauthClient.count({ where: { clientId } })).toBe(0);
	});

	test("keeps its content inside the dialog", async ({ page }) => {
		await openMcpDialog(page);

		// The nowrap register command used to widen the grid track and push every
		// child past the right edge.
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
