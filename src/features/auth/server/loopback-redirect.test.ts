import { afterEach, describe, expect, it, vi } from "vitest";
import { normalizeLoopbackRedirect } from "@/features/auth/server/loopback-redirect";

const BASE = "http://localhost:3001";

function authorize(redirectUri: string): Request {
	const url = new URL(`${BASE}/api/auth/oauth2/authorize`);
	url.searchParams.set("client_id", "https://claude.ai/oauth/x");
	url.searchParams.set("redirect_uri", redirectUri);
	return new Request(url);
}

function token(redirectUri: string): Request {
	return new Request(`${BASE}/api/auth/oauth2/token`, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			grant_type: "authorization_code",
			code: "abc",
			redirect_uri: redirectUri,
		}).toString(),
	});
}

const redirectOf = (request: Request) =>
	new URL(request.url).searchParams.get("redirect_uri");

afterEach(() => {
	vi.unstubAllEnvs();
});

describe("normalizeLoopbackRedirect", () => {
	describe("in development", () => {
		const dev = () => vi.stubEnv("NODE_ENV", "development");

		it("rewrites a localhost callback to the loopback literal on authorize", async () => {
			dev();
			const result = await normalizeLoopbackRedirect(
				authorize("http://localhost:3118/callback"),
			);
			expect(redirectOf(result)).toBe("http://127.0.0.1:3118/callback");
		});

		it("rewrites the token exchange identically, so the code still matches", async () => {
			dev();
			const result = await normalizeLoopbackRedirect(
				token("http://localhost:3118/callback"),
			);
			const params = new URLSearchParams(await result.text());
			expect(params.get("redirect_uri")).toBe("http://127.0.0.1:3118/callback");
			expect(params.get("code")).toBe("abc");
		});

		it("leaves a loopback literal untouched", async () => {
			dev();
			const result = await normalizeLoopbackRedirect(
				authorize("http://127.0.0.1:3118/callback"),
			);
			expect(redirectOf(result)).toBe("http://127.0.0.1:3118/callback");
		});

		it("never touches a non-loopback host", async () => {
			dev();
			const result = await normalizeLoopbackRedirect(
				authorize("https://app.example.com/callback"),
			);
			expect(redirectOf(result)).toBe("https://app.example.com/callback");
		});

		it("ignores endpoints other than authorize and token", async () => {
			dev();
			const url = new URL(`${BASE}/api/auth/sign-in/email`);
			url.searchParams.set("redirect_uri", "http://localhost:3118/callback");
			const result = await normalizeLoopbackRedirect(new Request(url));
			expect(redirectOf(result)).toBe("http://localhost:3118/callback");
		});
	});

	for (const nodeEnv of ["production", "test", undefined]) {
		it(`is inert when NODE_ENV is ${nodeEnv ?? "unset"}`, async () => {
			vi.stubEnv("NODE_ENV", nodeEnv);
			const result = await normalizeLoopbackRedirect(
				authorize("http://localhost:3118/callback"),
			);
			expect(redirectOf(result)).toBe("http://localhost:3118/callback");
		});
	}
});
