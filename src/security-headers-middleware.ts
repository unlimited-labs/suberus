import { createMiddleware } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";

export const CSP_REPORT_PATH = "/api/csp-report";

const PERMISSIONS_POLICY = [
	"accelerometer=()",
	"autoplay=()",
	"bluetooth=()",
	"browsing-topics=()",
	"camera=()",
	"display-capture=()",
	"encrypted-media=()",
	"gyroscope=()",
	"hid=()",
	"idle-detection=()",
	"magnetometer=()",
	"microphone=()",
	"midi=()",
	"payment=()",
	"screen-wake-lock=()",
	"serial=()",
	"usb=()",
	"xr-spatial-tracking=()",
	"clipboard-write=(self)",
	"fullscreen=(self)",
	"geolocation=(self)",
	"publickey-credentials-create=(self)",
	"publickey-credentials-get=(self)",
].join(", ");

const MAP_TILES = "https://*.cartocdn.com";
// MJML emails link Google Fonts; the bulk-email preview iframe (srcdoc) inherits this policy.
const EMAIL_FONTS_CSS = "https://fonts.googleapis.com";
const EMAIL_FONTS = "https://fonts.gstatic.com";

export function contentSecurityPolicy(nonce: string): string {
	return [
		"default-src 'self'",
		`script-src 'nonce-${nonce}' 'strict-dynamic'`,
		`style-src 'self' 'unsafe-inline' ${EMAIL_FONTS_CSS}`,
		"img-src 'self' data: blob: https:",
		`font-src 'self' data: ${EMAIL_FONTS}`,
		`connect-src 'self' ${MAP_TILES}`,
		"worker-src 'self' blob:",
		"frame-src 'self' blob:",
		"object-src 'none'",
		"base-uri 'self'",
		"form-action 'self'",
		"frame-ancestors 'self'",
		`report-uri ${CSP_REPORT_PATH}`,
	].join("; ");
}

export const securityHeadersMiddleware = createMiddleware().server(
	async ({ next }) => {
		const nonce = crypto.randomUUID().replaceAll("-", "");
		setResponseHeader("Permissions-Policy", PERMISSIONS_POLICY);
		// Vite's dev client injects un-nonced inline scripts; dev would only report noise.
		if (!import.meta.env.DEV) {
			setResponseHeader(
				"Content-Security-Policy-Report-Only",
				contentSecurityPolicy(nonce),
			);
		}
		return next({ context: { nonce } });
	},
);
