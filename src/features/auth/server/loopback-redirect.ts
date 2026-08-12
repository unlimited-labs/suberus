const AUTHORIZE_PATH = "/api/auth/oauth2/authorize";
const TOKEN_PATH = "/api/auth/oauth2/token";

function toLoopbackIp(value: string | null): string | null {
	if (!value) return null;
	try {
		const url = new URL(value);
		if (url.hostname !== "localhost") return null;
		url.hostname = "127.0.0.1";
		return url.toString();
	} catch {
		return null;
	}
}

/**
 * Development-only workaround for anthropics/claude-code#37747: the CLI sends
 * `http://localhost:3118/callback` while its Client ID Metadata Document
 * declares the portless `http://localhost/callback` and
 * `http://127.0.0.1/callback`. RFC 8252 §7.3 waives the port only for loopback
 * *IP* redirect URIs, so better-auth rejects the DNS name outright.
 *
 * Rewriting the host to the literal the client itself published lets the port
 * exception apply. Registration is still enforced: a client without a matching
 * `127.0.0.1` entry keeps failing. Remove once the CLI sends `127.0.0.1` or its
 * document declares `application_type: "native"`.
 */
export async function normalizeLoopbackRedirect(
	request: Request,
): Promise<Request> {
	// Read directly rather than through @/env: this keeps the module importable
	// without the full validated env, and an unset NODE_ENV disables the
	// workaround instead of enabling it.
	if (process.env.NODE_ENV !== "development") return request;

	const url = new URL(request.url);

	if (url.pathname === AUTHORIZE_PATH) {
		const rewritten = toLoopbackIp(url.searchParams.get("redirect_uri"));
		if (!rewritten) return request;
		url.searchParams.set("redirect_uri", rewritten);
		return new Request(url, request);
	}

	if (url.pathname === TOKEN_PATH && request.method === "POST") {
		const body = await request.text();
		const params = new URLSearchParams(body);
		const rewritten = toLoopbackIp(params.get("redirect_uri"));
		// The authorization code is bound to the redirect_uri used at authorize
		// time, so the token step has to be rewritten identically or the exchange
		// fails on a mismatch.
		params.set("redirect_uri", rewritten ?? params.get("redirect_uri") ?? "");
		return new Request(url, {
			method: request.method,
			headers: request.headers,
			body: rewritten ? params.toString() : body,
		});
	}

	return request;
}
