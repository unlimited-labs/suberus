export function resolveGroupCollapse(
	index: number,
	groupKey: string,
	collapsedKeys: ReadonlySet<string>,
) {
	const toggleKey = index === 0 ? groupKey : `open:${groupKey}`;
	const isCollapsed =
		index === 0 ? collapsedKeys.has(toggleKey) : !collapsedKeys.has(toggleKey);
	return { toggleKey, isCollapsed };
}
