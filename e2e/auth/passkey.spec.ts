import { loginAs } from "../helpers/auth"
import { TEST_USER } from "../helpers/test-users"
import { expect, test } from "./fixtures"

// NOTE: the full WebAuthn ceremony (register/sign-in with a CDP virtual
// authenticator) cannot run on this harness — it serves over http://127.0.0.1,
// and the browser rejects a raw IP as a relying-party ID ("invalid domain").
// Passkeys require a domain or "localhost", so the ceremony is verified manually
// on dev (localhost). These specs cover the wiring/render that IS testable here:
// listing a user's passkeys needs no ceremony, so the management UI and the
// sign-in affordances must still appear and not break the page.

test.describe("Passkey", () => {
	test("login page offers passkey sign-in with autofill", async ({ page }) => {
		await page.goto("/login")

		await expect(page.getByLabel("E-mail")).toHaveAttribute(
			"autocomplete",
			"username webauthn",
		)
		await expect(page.getByTestId("passkey-signin")).toBeVisible()
	})

	test("profile security shows passkey management", async ({ page }) => {
		await loginAs(page, TEST_USER)
		await page.goto("/profile")

		await expect(page.getByRole("heading", { name: "Passkeys" })).toBeVisible()
		await expect(page.getByTestId("passkey-add")).toBeVisible()
		await expect(page.getByTestId("passkey-name")).toBeVisible()
	})
})
