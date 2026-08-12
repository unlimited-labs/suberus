export const DESKTOP_CLIENT_ID_PREFIX = "suberus-desktop-";

/**
 * Claude Code uses the DNS name, never `127.0.0.1`, and RFC 8252 §7.3 waives
 * the port only for IP literals — so the registered URI must match exactly.
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
