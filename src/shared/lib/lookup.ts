/**
 * Read a lookup table with a key the caller only knows as a string (DB enums,
 * URL params). Returns undefined when the key is absent instead of widening
 * the table's value types.
 */
export function lookup<Table extends object>(
	table: Table,
	key: PropertyKey,
): Table[keyof Table] | undefined {
	// SAFETY: hasOwn established the key is one of Table's own keys.
	return Object.hasOwn(table, key) ? table[key as keyof Table] : undefined;
}
