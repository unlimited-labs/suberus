/** Per-version snapshot of the author composition, for the metadata diff. */
export interface CompareAuthor {
	firstName: string;
	lastName: string;
	email: string;
	affiliation: string;
	isPresenter: boolean;
}

/**
 * Render an author list as one line per author so it can be word-diffed, e.g.
 * "Ann Vo <ann@x.io> (MIT) ★ presenter". Empty/undefined → "" (an empty diff).
 */
export function authorsToText(authors: CompareAuthor[] | undefined): string {
	if (!authors || authors.length === 0) return "";
	return authors
		.map((a) => {
			const aff = a.affiliation ? ` (${a.affiliation})` : "";
			const star = a.isPresenter ? " ★ presenter" : "";
			return `${a.firstName} ${a.lastName} <${a.email}>${aff}${star}`;
		})
		.join("\n");
}

/** Render a keyword set as one keyword per line for word-diffing. */
export function keywordsToText(keywords: string[] | undefined): string {
	return (keywords ?? []).join("\n");
}
