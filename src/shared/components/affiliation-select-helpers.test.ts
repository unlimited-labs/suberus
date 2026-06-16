import { describe, expect, it } from "vitest";
import {
	affiliationAriaProps,
	computeAffiliationDropdownState,
	nextHighlightedIndex,
	resolveAffiliationKeyAction,
} from "./affiliation-select-helpers";

const list = [{ name: "MIT" }, { name: "Stanford" }];

describe("computeAffiliationDropdownState", () => {
	it("offers create for a novel non-empty query", () => {
		const s = computeAffiliationDropdownState({
			affiliations: list,
			inputValue: "Cambridge",
			isLoading: false,
			open: true,
		});
		expect(s.hasExactMatch).toBe(false);
		expect(s.showCreate).toBe(true);
		expect(s.totalItems).toBe(3);
		expect(s.showDropdown).toBe(true);
	});

	it("suppresses create on an exact (case-insensitive) match", () => {
		const s = computeAffiliationDropdownState({
			affiliations: list,
			inputValue: "  mit ",
			isLoading: false,
			open: true,
		});
		expect(s.hasExactMatch).toBe(true);
		expect(s.showCreate).toBe(false);
		expect(s.totalItems).toBe(2);
	});

	it("never offers create while loading", () => {
		const s = computeAffiliationDropdownState({
			affiliations: [],
			inputValue: "New",
			isLoading: true,
			open: true,
		});
		expect(s.showCreate).toBe(false);
		expect(s.showDropdown).toBe(true); // loading spinner row
	});

	it("stays closed when not open or query empty", () => {
		expect(
			computeAffiliationDropdownState({
				affiliations: list,
				inputValue: "x",
				isLoading: false,
				open: false,
			}).showDropdown,
		).toBe(false);
		expect(
			computeAffiliationDropdownState({
				affiliations: [],
				inputValue: "   ",
				isLoading: false,
				open: true,
			}).showDropdown,
		).toBe(false);
	});
});

describe("nextHighlightedIndex", () => {
	it("advances and wraps to the top going down", () => {
		expect(nextHighlightedIndex(0, 3, "down")).toBe(1);
		expect(nextHighlightedIndex(2, 3, "down")).toBe(0);
	});

	it("retreats and wraps to the bottom going up", () => {
		expect(nextHighlightedIndex(1, 3, "up")).toBe(0);
		expect(nextHighlightedIndex(0, 3, "up")).toBe(2);
	});
});

describe("resolveAffiliationKeyAction", () => {
	const open = {
		open: true,
		hasQuery: true,
		highlightedIndex: -1,
		totalItems: 2,
		affiliationsLength: 2,
		showCreate: false,
	};

	it("opens on any key (with a query) while closed, except Escape", () => {
		expect(
			resolveAffiliationKeyAction("a", { ...open, open: false }).type,
		).toBe("open");
		expect(
			resolveAffiliationKeyAction("a", {
				...open,
				open: false,
				hasQuery: false,
			}).type,
		).toBe("none");
	});

	it("navigates with arrows", () => {
		expect(
			resolveAffiliationKeyAction("ArrowDown", {
				...open,
				highlightedIndex: 0,
			}),
		).toEqual({ type: "navigate", index: 1 });
		expect(
			resolveAffiliationKeyAction("ArrowUp", { ...open, highlightedIndex: 0 }),
		).toEqual({ type: "navigate", index: 1 });
	});

	it("selects a highlighted option on Enter", () => {
		expect(
			resolveAffiliationKeyAction("Enter", { ...open, highlightedIndex: 1 }),
		).toEqual({ type: "select", index: 1 });
	});

	it("creates on Enter when the create row is highlighted", () => {
		expect(
			resolveAffiliationKeyAction("Enter", {
				...open,
				showCreate: true,
				highlightedIndex: 2,
			}),
		).toEqual({ type: "create" });
	});

	it("does nothing on Enter with no highlight", () => {
		expect(resolveAffiliationKeyAction("Enter", open)).toEqual({
			type: "none",
		});
	});

	it("closes on Escape (even while closed)", () => {
		expect(resolveAffiliationKeyAction("Escape", open).type).toBe("close");
		expect(
			resolveAffiliationKeyAction("Escape", { ...open, open: false }).type,
		).toBe("close");
	});
});

describe("affiliationAriaProps", () => {
	it("references the listbox only when open", () => {
		expect(affiliationAriaProps(true, -1)["aria-controls"]).toBe(
			"affiliation-listbox",
		);
		expect(affiliationAriaProps(false, -1)["aria-controls"]).toBeUndefined();
	});

	it("references the active option only when one is highlighted", () => {
		expect(affiliationAriaProps(true, 2)["aria-activedescendant"]).toBe(
			"affiliation-option-2",
		);
		expect(
			affiliationAriaProps(true, -1)["aria-activedescendant"],
		).toBeUndefined();
	});
});
