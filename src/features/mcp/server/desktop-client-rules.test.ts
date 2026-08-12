import { describe, expect, it } from "vitest";
import { connectCommand } from "@/features/mcp/labels";
import {
	callbackPortFromRedirectUri,
	desktopRedirectUri,
} from "@/features/mcp/server/desktop-client-rules";

describe("desktopRedirectUri", () => {
	it("registers the DNS loopback name Claude Code actually sends", () => {
		expect(desktopRedirectUri(8080)).toBe("http://localhost:8080/callback");
	});
});

describe("callbackPortFromRedirectUri", () => {
	it("reads the port back", () => {
		expect(callbackPortFromRedirectUri("http://localhost:9123/callback")).toBe(
			9123,
		);
	});

	it("returns null for a portless or malformed uri", () => {
		expect(callbackPortFromRedirectUri("http://localhost/callback")).toBeNull();
		expect(callbackPortFromRedirectUri("not a url")).toBeNull();
	});
});

describe("connectCommand", () => {
	const url = "https://conf.example/api/mcp";

	it("stays bare without a minted client", () => {
		expect(connectCommand({ url })).toBe(
			`claude mcp add --transport http suberus ${url}`,
		);
	});

	it("carries the pre-registered client and its port", () => {
		expect(
			connectCommand({
				url,
				clientId: "suberus-desktop-abc",
				callbackPort: 8080,
			}),
		).toBe(
			`claude mcp add --transport http suberus ${url} --client-id suberus-desktop-abc --callback-port 8080`,
		);
	});
});
