// Pure helpers (no server deps) so they stay unit-testable without storage.

const FIGURE_SRC_RE = /src="figures\/([0-9a-f]{64})\.png"/g;

/** Unique content-addressed figure shas referenced in the HTML. */
export function figureShas(html: string): string[] {
	return [...new Set([...html.matchAll(FIGURE_SRC_RE)].map((m) => m[1]))];
}

/**
 * Replace each content-addressed figure ref via `toUri`; refs whose `toUri`
 * returns `undefined` are left untouched.
 */
export function mapFigureSrcs(
	html: string,
	toUri: (sha: string) => string | undefined,
): string {
	return html.replace(FIGURE_SRC_RE, (whole, sha) => {
		const uri = toUri(sha);
		return uri ? `src="${uri}"` : whole;
	});
}
