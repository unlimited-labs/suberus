import { describe, expect, it } from "vitest";
import {
	mcpClientChangedFields,
	mcpClientRegisteredDetail,
	mcpClientUpdatedDetail,
} from "./cimd-audit-rules";

const client = { clientId: "https://client.example/mcp-client.json" };

describe("mcpClientRegisteredDetail", () => {
	it("keeps only the audited fields of the metadata document", () => {
		const document = {
			client_name: "Offline CIMD client",
			redirect_uris: ["https://client.example/cb"],
			logo_uri: "https://client.example/logo.png",
			token_endpoint_auth_method: "none",
		};
		expect(mcpClientRegisteredDetail(client, document)).toEqual({
			type: "MCP_CLIENT_REGISTERED",
			clientId: "https://client.example/mcp-client.json",
			clientName: "Offline CIMD client",
			redirectUris: ["https://client.example/cb"],
		});
	});

	it("represents a nameless client and an empty redirect list", () => {
		expect(mcpClientRegisteredDetail(client, {})).toEqual({
			type: "MCP_CLIENT_REGISTERED",
			clientId: client.clientId,
			clientName: null,
			redirectUris: [],
		});
	});

	it("bounds attacker-controlled length and cardinality", () => {
		const detail = mcpClientRegisteredDetail(client, {
			client_name: "n".repeat(900),
			redirect_uris: Array.from(
				{ length: 25 },
				(_, i) => `https://client.example/cb/${i}`,
			),
		});
		expect(detail.clientName).toHaveLength(501);
		expect(detail.clientName?.endsWith("…")).toBe(true);
		expect(detail.redirectUris).toHaveLength(10);
	});
});

describe("mcpClientChangedFields", () => {
	const previous = {
		clientId: client.clientId,
		name: "Old",
		redirectUris: ["https://client.example/cb"],
		scopes: ["openid"],
	};

	it("is empty when reconciliation changed nothing", () => {
		expect(mcpClientChangedFields(previous, { ...previous })).toEqual([]);
	});

	it("reports every audited field that moved", () => {
		expect(
			mcpClientChangedFields(previous, {
				clientId: client.clientId,
				name: "New",
				redirectUris: ["https://evil.example/cb"],
				scopes: ["openid", "users:write"],
			}),
		).toEqual(["name", "redirectUris", "scopes"]);
	});

	it("treats redirect URI order as a change and absence as empty", () => {
		expect(
			mcpClientChangedFields(
				{
					...previous,
					redirectUris: ["https://a.example", "https://b.example"],
				},
				{
					...previous,
					redirectUris: ["https://b.example", "https://a.example"],
				},
			),
		).toEqual(["redirectUris"]);
		expect(
			mcpClientChangedFields(
				{ clientId: client.clientId },
				{ clientId: client.clientId, redirectUris: [], scopes: [] },
			),
		).toEqual([]);
	});
});

describe("mcpClientUpdatedDetail", () => {
	it("carries the changed field list alongside the snapshot", () => {
		expect(
			mcpClientUpdatedDetail(
				client,
				{ client_name: "Renamed", redirect_uris: ["https://evil.example/cb"] },
				["name", "redirectUris"],
			),
		).toEqual({
			type: "MCP_CLIENT_UPDATED",
			clientId: client.clientId,
			clientName: "Renamed",
			redirectUris: ["https://evil.example/cb"],
			changedFields: ["name", "redirectUris"],
		});
	});
});
