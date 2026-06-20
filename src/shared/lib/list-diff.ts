/**
 * Structural diff of two ordered lists keyed by identity — added / removed /
 * moved / changed / unchanged — instead of diffing a flattened text blob. Used
 * for version-compare metadata (authors keyed by email, keywords by value) so a
 * reviewer sees "author X added, keyword Y removed, author Z moved" rather than a
 * wall of word-level changes.
 */

export type ListDiffStatus =
	| "added"
	| "removed"
	| "moved"
	| "changed"
	| "unchanged";

export interface ListDiffEntry<T> {
	status: ListDiffStatus;
	/** The new item, or — for `removed` — the old item. */
	item: T;
	/** The old item, present only when `status` is `changed`. */
	previous?: T;
}

/**
 * Diff `oldList` vs `newList`. Entries follow new-list order, with removed items
 * appended. `key` identifies an item across versions; `equal` decides whether a
 * matched pair counts as `changed` (defaults to key equality → never changed).
 */
export function diffList<T>(
	oldList: T[],
	newList: T[],
	key: (item: T) => string,
	equal: (a: T, b: T) => boolean = (a, b) => key(a) === key(b),
): ListDiffEntry<T>[] {
	const oldIndex = new Map<string, number>();
	oldList.forEach((item, i) => {
		oldIndex.set(key(item), i);
	});
	const newKeys = new Set(newList.map(key));

	const entries: ListDiffEntry<T>[] = newList.map((item, i) => {
		const k = key(item);
		const oi = oldIndex.get(k);
		if (oi === undefined) return { status: "added", item };
		const old = oldList[oi];
		if (!equal(old, item)) return { status: "changed", item, previous: old };
		if (oi !== i) return { status: "moved", item };
		return { status: "unchanged", item };
	});

	for (const item of oldList) {
		if (!newKeys.has(key(item))) entries.push({ status: "removed", item });
	}
	return entries;
}

/** Whether a diff has any non-`unchanged` entry. */
export function listChanged<T>(entries: ListDiffEntry<T>[]): boolean {
	return entries.some((e) => e.status !== "unchanged");
}
