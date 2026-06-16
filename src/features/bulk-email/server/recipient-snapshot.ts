import { joinTitles, type RecipientSnapshot } from "../lib/placeholders";

/** Minimal user shape needed to snapshot a recipient (owned submissions only). */
export interface SnapshotUser {
	id: string;
	email: string;
	firstName: string | null;
	lastName: string | null;
	submissions: Array<{ title: string }>;
}

/**
 * Freezes a recipient's placeholder data at draft-creation time, so later edits
 * to the user's name or submissions don't change what a queued campaign sends.
 */
export function buildRecipientSnapshot(user: SnapshotUser): RecipientSnapshot {
	return {
		userId: user.id,
		email: user.email,
		firstName: user.firstName,
		lastName: user.lastName,
		titles: joinTitles(user.submissions.map((s) => s.title)),
	};
}
