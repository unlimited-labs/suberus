export interface AffiliationDropdownState {
	hasExactMatch: boolean;
	showCreate: boolean;
	totalItems: number;
	showDropdown: boolean;
}

export function computeAffiliationDropdownState({
	affiliations,
	inputValue,
	isLoading,
	open,
}: {
	affiliations: { name: string }[];
	inputValue: string;
	isLoading: boolean;
	open: boolean;
}): AffiliationDropdownState {
	const trimmed = inputValue.trim();
	const hasExactMatch = affiliations.some(
		(a) => a.name.toLowerCase() === trimmed.toLowerCase(),
	);
	const showCreate = !!trimmed && !hasExactMatch && !isLoading;
	const totalItems = affiliations.length + (showCreate ? 1 : 0);
	const showDropdown =
		open && (affiliations.length > 0 || showCreate || isLoading);
	return { hasExactMatch, showCreate, totalItems, showDropdown };
}

export type AffiliationKeyAction =
	| { type: "none" }
	| { type: "open" }
	| { type: "navigate"; index: number }
	| { type: "select"; index: number }
	| { type: "create" }
	| { type: "close" };

export function nextHighlightedIndex(
	prev: number,
	totalItems: number,
	direction: "down" | "up",
): number {
	if (direction === "down") return prev < totalItems - 1 ? prev + 1 : 0;
	return prev > 0 ? prev - 1 : totalItems - 1;
}

function resolveEnterAction(
	highlightedIndex: number,
	affiliationsLength: number,
	showCreate: boolean,
): AffiliationKeyAction {
	if (highlightedIndex >= 0 && highlightedIndex < affiliationsLength) {
		return { type: "select", index: highlightedIndex };
	}
	if (showCreate && highlightedIndex === affiliationsLength) {
		return { type: "create" };
	}
	return { type: "none" };
}

export interface AffiliationKeyContext {
	open: boolean;
	hasQuery: boolean;
	highlightedIndex: number;
	totalItems: number;
	affiliationsLength: number;
	showCreate: boolean;
}

export function resolveAffiliationKeyAction(
	key: string,
	ctx: AffiliationKeyContext,
): AffiliationKeyAction {
	if (!ctx.open && key !== "Escape") {
		return ctx.hasQuery ? { type: "open" } : { type: "none" };
	}
	switch (key) {
		case "ArrowDown":
			return {
				type: "navigate",
				index: nextHighlightedIndex(
					ctx.highlightedIndex,
					ctx.totalItems,
					"down",
				),
			};
		case "ArrowUp":
			return {
				type: "navigate",
				index: nextHighlightedIndex(ctx.highlightedIndex, ctx.totalItems, "up"),
			};
		case "Enter":
			return resolveEnterAction(
				ctx.highlightedIndex,
				ctx.affiliationsLength,
				ctx.showCreate,
			);
		case "Escape":
			return { type: "close" };
		default:
			return { type: "none" };
	}
}

export function affiliationAriaProps(highlightedIndex: number) {
	return {
		"aria-activedescendant":
			highlightedIndex >= 0
				? `affiliation-option-${highlightedIndex}`
				: undefined,
	};
}
