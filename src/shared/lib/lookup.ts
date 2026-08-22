export function lookup<Table extends object>(
	table: Table,
	key: PropertyKey,
): Table[keyof Table] | undefined {
	// SAFETY: hasOwn established the key is one of Table's own keys.
	return Object.hasOwn(table, key) ? table[key as keyof Table] : undefined;
}
