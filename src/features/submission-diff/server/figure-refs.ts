// Pure helper (no server deps) so it stays unit-testable without a DB.

// Rewrite content-addressed figure refs to the auth-gated proxy route.
const FIGURE_SRC_RE = /src="figures\/([0-9a-f]{64})\.png"/g;

export function rewriteFigureSrcs(html: string): string {
	return html.replace(
		FIGURE_SRC_RE,
		(_m, sha) => `src="/api/version-diff/figures/${sha}"`,
	);
}
