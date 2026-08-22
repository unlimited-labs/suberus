const FIGURE_SRC_RE = /src="figures\/([0-9a-f]{64})\.png"/g;

export function figureShas(html: string): string[] {
	return [...new Set([...html.matchAll(FIGURE_SRC_RE)].map((m) => m[1]))];
}

export function mapFigureSrcs(
	html: string,
	toUri: (sha: string) => string | undefined,
): string {
	return html.replace(FIGURE_SRC_RE, (whole, sha) => {
		const uri = toUri(sha);
		return uri ? `src="${uri}"` : whole;
	});
}
