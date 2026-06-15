import { E2E_GIT_COMMIT } from "../../playwright.config"
import { test, expect, loginAsTestUser } from "./fixtures"

const STALE_HASH =
	"3213feaac8eba847ac1d4909d0342b8091b0be90dd3cc951ee69154aa9b3c471"

// After a live deploy, tabs open from before run the OLD client bundle against
// the NEW server build. The banner (mounted in the authenticated _app layout)
// must surface on every detection path — and must NOT false-fire on a genuine
// server error. The E2E server runs with a fixed GIT_COMMIT + a 500ms poll
// interval (see playwright.config envFor), exercising the real header/poll
// paths instead of the dormant "unknown" default.

async function gotoApp(page: import("@playwright/test").Page) {
	await loginAsTestUser(page)
	await page.goto("/submissions")
	await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
}

async function waitForBaseline(page: import("@playwright/test").Page) {
	// The baseline commit is captured from the first real /api/version poll.
	await page.waitForResponse(
		(r) => r.url().includes("/api/version") && r.status() === 200,
	)
}

// Open the app, confirm no banner yet, and capture the baseline commit from the
// first real poll before a test simulates a redeploy. Returns the banner locator.
async function startSkewTest(page: import("@playwright/test").Page) {
	await gotoApp(page)
	const banner = page.getByTestId("version-skew-banner")
	await expect(banner).toBeHidden()
	await waitForBaseline(page)
	return banner
}

test.describe("Version skew banner", () => {
	test("server reports its commit, and a stale-hash server fn 500s without leaking the header", async ({
		page,
	}) => {
		await gotoApp(page)

		const version = await page.evaluate(async () => {
			const res = await fetch("/api/version")
			return res.json()
		})
		expect(version.commit).toBe(E2E_GIT_COMMIT)
		expect(version.pollMs).toBe(500)

		// The stamped x-app-version header does NOT survive the thrown
		// "info not found" error, and prod hides the message (generic body) — so
		// a stale-hash 500 is indistinguishable from a genuine 500 on the client.
		// This is why a headerless server-fn error triggers an active version
		// re-check rather than assuming skew.
		const stale = await page.evaluate(async (hash) => {
			const res = await fetch(`/_serverFn/${hash}`)
			return { status: res.status, version: res.headers.get("x-app-version") }
		}, STALE_HASH)
		expect(stale.status).toBe(500)
		expect(stale.version).toBeNull()
	})

	test("poll detects a new backend commit and raises the banner", async ({
		page,
	}) => {
		const banner = await startSkewTest(page)

		await page.route("**/api/version", (route) =>
			route.fulfill({
				contentType: "application/json",
				body: JSON.stringify({
					commit: "deployed-anew",
					builtAt: "2026-06-15",
					pollMs: 500,
				}),
			}),
		)

		await expect(banner).toBeVisible()
	})

	test("a server fn response with a mismatched version header raises the banner", async ({
		page,
	}) => {
		const banner = await startSkewTest(page)

		await page.route(`**/_serverFn/${STALE_HASH}`, (route) =>
			route.fulfill({
				status: 200,
				headers: { "x-app-version": "deployed-anew" },
				contentType: "application/json",
				body: "{}",
			}),
		)
		await page.evaluate(
			(hash) => fetch(`/_serverFn/${hash}`).catch(() => {}),
			STALE_HASH,
		)

		await expect(banner).toBeVisible()
	})

	test("a genuine server fn 500 on the same version does NOT raise the banner", async ({
		page,
	}) => {
		const banner = await startSkewTest(page)

		// Headerless 500, but the backend version is unchanged (real /api/version
		// still returns E2E_GIT_COMMIT). The active re-check must keep the banner
		// hidden — refreshing wouldn't fix a real bug.
		await page.route(`**/_serverFn/${STALE_HASH}`, (route) =>
			route.fulfill({
				status: 500,
				contentType: "application/json",
				body: JSON.stringify({ status: 500, unhandled: true, message: "HTTPError" }),
			}),
		)
		await page.evaluate(
			(hash) => fetch(`/_serverFn/${hash}`).catch(() => {}),
			STALE_HASH,
		)

		// Allow several poll cycles + the re-check to run, then confirm no banner.
		await page.waitForTimeout(2000)
		await expect(banner).toBeHidden()
	})

	test("raises the banner on a chunk load error and reloads on click", async ({
		page,
	}) => {
		await gotoApp(page)
		const banner = page.getByTestId("version-skew-banner")
		await expect(banner).toBeHidden()

		// Stale bundle references hashed chunk filenames the new build no longer
		// serves → route navigation lazy-loads fail (the observed prod crash).
		await page.evaluate(() => {
			window.dispatchEvent(
				new ErrorEvent("error", {
					error: new Error("ChunkLoadError: Loading chunk 42 failed"),
				}),
			)
		})
		await expect(banner).toBeVisible()

		// Refresh reloads the document (drops the marker set on the old context).
		await page.evaluate(() => {
			;(window as unknown as { __beforeReload?: boolean }).__beforeReload = true
		})
		await page.getByTestId("version-skew-reload").click()
		await expect
			.poll(() =>
				page.evaluate(
					() =>
						(window as unknown as { __beforeReload?: boolean })
							.__beforeReload ?? false,
				),
			)
			.toBe(false)
	})
})
