import { describe, expect, it } from "vitest";
import { resolveGroupCollapse } from "./unscheduled-sidebar-helpers";

describe("resolveGroupCollapse", () => {
	it("expands the first group by default, collapses the rest", () => {
		const empty = new Set<string>();
		expect(resolveGroupCollapse(0, "intake", empty)).toEqual({
			toggleKey: "intake",
			isCollapsed: false,
		});
		expect(resolveGroupCollapse(1, "intake", empty)).toEqual({
			toggleKey: "open:intake",
			isCollapsed: true,
		});
	});

	it("inverts the default when the toggle key is present", () => {
		expect(resolveGroupCollapse(0, "a", new Set(["a"])).isCollapsed).toBe(true);
		expect(resolveGroupCollapse(2, "b", new Set(["open:b"])).isCollapsed).toBe(
			false,
		);
	});
});
