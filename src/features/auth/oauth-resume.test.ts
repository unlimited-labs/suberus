import { describe, expect, it } from "vitest";
import { oauthResumeSearch } from "./oauth-resume";

const signed = "client_id=abc&scope=users%3Aread&sig=xyz&exp=1";

describe("oauthResumeSearch", () => {
	it("ignores a login page opened outside an OAuth flow", () => {
		expect(oauthResumeSearch("")).toBeNull();
		expect(oauthResumeSearch("?client_id=abc")).toBeNull();
	});

	it("keeps the signed query verbatim", () => {
		const resumed = new URLSearchParams(oauthResumeSearch(`?${signed}`) ?? "");
		expect(resumed.get("sig")).toBe("xyz");
		expect(resumed.get("scope")).toBe("users:read");
	});

	// A retained prompt=login would send authorize straight back to /login.
	it("drops prompt=login but keeps other prompts", () => {
		expect(oauthResumeSearch(`?${signed}&prompt=login`)).not.toContain(
			"prompt",
		);
		expect(oauthResumeSearch(`?${signed}&prompt=login+consent`)).toContain(
			"prompt=consent",
		);
	});
});
