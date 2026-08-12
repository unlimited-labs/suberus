import { createHash, randomBytes, randomUUID } from "node:crypto";
import { auth } from "@/features/auth/server/auth.server";
import { prisma } from "@/shared/server/db.server";

const BASE = process.env.APP_BASE_URL ?? "http://localhost:3001";
const RESOURCE = `${BASE}/api/mcp`;
const REDIRECT_URI = "http://127.0.0.1:9999/callback";
// Derived, not literal: stable across runs so the account can be reused, and
// unguessable without this deployment's AUTH_SECRET.
const ADMIN = {
	email: "mcp-smoke@e2e.local",
	password: createHash("sha256")
		.update(`mcp-smoke:${process.env.AUTH_SECRET ?? ""}`)
		.digest("base64url")
		.slice(0, 24),
};

// This script mints a verified ADMIN account. Pointed at a production DATABASE_URL
// it would leave a permanent backdoor, so refuse anywhere but local development.
if (process.env.NODE_ENV === "production" || !BASE.includes("localhost")) {
	throw new Error(
		`mcp-smoke is a local development tool; refusing to run against ${BASE}`,
	);
}

const b64url = (b: Buffer) => b.toString("base64url");

function step(name: string, ok: boolean, detail = "") {
	console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
	if (!ok) process.exitCode = 1;
}

async function ensureAdmin() {
	const existing = await prisma.user.findUnique({
		where: { email: ADMIN.email },
	});
	if (existing) return;
	await auth.api.signUpEmail({
		body: {
			email: ADMIN.email,
			password: ADMIN.password,
			name: "Smoke",
			firstName: "MCP",
		},
	});
	await prisma.user.update({
		where: { email: ADMIN.email },
		data: { role: "ADMIN", emailVerified: true },
	});
}

async function ensureClient() {
	const clientId = "smoke-client";
	await prisma.oauthConsent.deleteMany({ where: { clientId } });
	await prisma.oauthClient.deleteMany({ where: { clientId } });
	await prisma.oauthClient.create({
		data: {
			clientId,
			name: "MCP smoke client",
			redirectUris: [REDIRECT_URI],
			grantTypes: ["authorization_code", "refresh_token"],
			responseTypes: ["code"],
			tokenEndpointAuthMethod: "none",
			scopes: ["openid", "profile", "email", "offline_access"],
			requirePKCE: true,
		},
	});
	await prisma.oauthClientResource.create({
		data: { clientId, resourceId: RESOURCE },
	});
	return { clientId };
}

async function signIn(): Promise<string> {
	const res = await fetch(`${BASE}/api/auth/sign-in/email`, {
		method: "POST",
		headers: { "Content-Type": "application/json", Origin: BASE },
		body: JSON.stringify(ADMIN),
	});
	const cookie = res.headers.getSetCookie().join("; ");
	if (!res.ok || !cookie) throw new Error(`sign-in failed: ${await res.text()}`);
	return cookie;
}

async function main() {
	await ensureAdmin();
	const { clientId } = await ensureClient();
	const cookie = await signIn();
	step("sign in as admin", true);

	const verifier = b64url(randomBytes(32));
	const challenge = b64url(createHash("sha256").update(verifier).digest());
	const state = randomUUID();

	const authorizeUrl = new URL(`${BASE}/api/auth/oauth2/authorize`);
	for (const [k, v] of Object.entries({
		response_type: "code",
		client_id: clientId,
		redirect_uri: REDIRECT_URI,
		scope: "openid profile email",
		state,
		code_challenge: challenge,
		code_challenge_method: "S256",
		resource: RESOURCE,
	}))
		authorizeUrl.searchParams.set(k, v);

	const authorizeRes = await fetch(authorizeUrl, {
		headers: { cookie },
		redirect: "manual",
	});
	// better-auth answers a non-navigation caller with a JSON redirect envelope
	// instead of a Location header.
	const body = await authorizeRes.text();
	const location =
		authorizeRes.headers.get("location") ??
		(body.startsWith("{") ? ((JSON.parse(body) as { url?: string }).url ?? "") : "");
	step(
		"authorize redirects to the consent page",
		location.includes("/consent"),
		`${authorizeRes.status} -> ${(location || body).slice(0, 100)}`,
	);

	const consentQuery = location.slice(location.indexOf("?"));
	const consentRes = await fetch(`${BASE}/api/auth/oauth2/consent`, {
		method: "POST",
		headers: { "Content-Type": "application/json", cookie, Origin: BASE },
		body: JSON.stringify({ accept: true, oauth_query: consentQuery }),
	});
	const consentBody: { redirect_uri?: string; url?: string } =
		await consentRes.json();
	const target = consentBody.redirect_uri ?? consentBody.url;
	const code = target ? new URL(target).searchParams.get("code") : null;
	step("consent returns an authorization code", Boolean(code));
	if (!code) throw new Error(JSON.stringify(consentBody));

	const tokenRes = await fetch(`${BASE}/api/auth/oauth2/token`, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			grant_type: "authorization_code",
			code,
			redirect_uri: REDIRECT_URI,
			client_id: clientId,
			code_verifier: verifier,
			resource: RESOURCE,
		}),
	});
	const tokens: { access_token?: string; error_description?: string } =
		await tokenRes.json();
	step(
		"token endpoint issues an access token",
		Boolean(tokens.access_token),
		tokens.error_description ?? "",
	);
	if (!tokens.access_token) throw new Error(JSON.stringify(tokens));

	const rpc = async (method: string, params?: unknown) => {
		const res = await fetch(RESOURCE, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json, text/event-stream",
				Authorization: `Bearer ${tokens.access_token}`,
			},
			body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
		});
		const text = await res.text();
		const json = text.startsWith("event:")
			? JSON.parse(text.slice(text.indexOf("data: ") + 6).split("\n")[0])
			: JSON.parse(text);
		return { status: res.status, json };
	};

	const init = await rpc("initialize", {
		protocolVersion: "2026-07-28",
		capabilities: {},
		clientInfo: { name: "smoke", version: "0" },
	});
	step("initialize", init.status === 200, `HTTP ${init.status}`);

	const list = await rpc("tools/list");
	const names: string[] = (list.json?.result?.tools ?? []).map(
		(t: { name: string }) => t.name,
	);
	step("tools/list returns the users tools", names.length > 0, names.join(", "));

	const call = await rpc("tools/call", {
		name: "users_list",
		arguments: { take: 5 },
	});
	const payload = call.json?.result?.content?.[0]?.text ?? "";
	const parsed = payload ? JSON.parse(payload) : null;
	step(
		"tools/call users_list returns data",
		typeof parsed?.total === "number",
		`total=${parsed?.total}`,
	);
}

main()
	.catch((e) => {
		console.error(e);
		process.exitCode = 1;
	})
	.finally(() => prisma.$disconnect());
