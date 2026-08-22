import { joinTitles, type RecipientSnapshot } from "../lib/placeholders";

export interface SnapshotUser {
	id: string;
	email: string;
	firstName: string | null;
	lastName: string | null;
	submissions: Array<{ title: string }>;
}

export function buildRecipientSnapshot(user: SnapshotUser): RecipientSnapshot {
	return {
		userId: user.id,
		email: user.email,
		firstName: user.firstName,
		lastName: user.lastName,
		titles: joinTitles(user.submissions.map((s) => s.title)),
	};
}
