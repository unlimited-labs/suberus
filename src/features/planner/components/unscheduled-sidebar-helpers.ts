/**
 * Default + toggle state for an unscheduled group's collapse. The first group
 * defaults to expanded and the rest to collapsed; a toggle inverts the default,
 * encoded by an `open:` key prefix for the non-first groups.
 */
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
