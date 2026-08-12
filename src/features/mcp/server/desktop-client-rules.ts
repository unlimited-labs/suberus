export const DESKTOP_CLIENT_ID_PREFIX = "suberus-desktop-";

/**
 * Claude Code builds its loopback callback as `http://localhost:<port>/callback`
 * — the DNS name, never `127.0.0.1`. RFC 8252 §7.3 waives the port only for
 * loopback *IP* literals, so the registered URI has to match this one exactly.
 */
export function desktopRedirectUri(port: number): string {
	return `http://localhost:${port}/callback`;
}

export function callbackPortFromRedirectUri(uri: string): number | null {
	try {
		const port = Number.parseInt(new URL(uri).port, 10);
		return Number.isNaN(port) ? null : port;
	} catch {
		return null;
	}
}
