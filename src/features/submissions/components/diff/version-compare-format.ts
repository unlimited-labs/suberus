/** Per-version snapshot of the author composition, for the metadata diff. */
export interface CompareAuthor {
	firstName: string;
	lastName: string;
	email: string;
	affiliation: string;
	isPresenter: boolean;
}

/** Display line for one author, e.g. "Ann Vo — MIT ★". */
export function authorLine(a: CompareAuthor): string {
	const aff = a.affiliation ? ` — ${a.affiliation}` : "";
	const star = a.isPresenter ? " ★" : "";
	return `${a.firstName} ${a.lastName}${aff}${star}`.trim();
}

/** Two author snapshots are equal iff every displayed field matches. */
export function authorsEqual(a: CompareAuthor, b: CompareAuthor): boolean {
	return (
		a.firstName === b.firstName &&
		a.lastName === b.lastName &&
		a.affiliation === b.affiliation &&
		a.isPresenter === b.isPresenter
	);
}
