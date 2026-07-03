import { describe, expect, it } from "vitest";
import { isNavItemActive, isNavItemVisible, type NavItem } from "./navigation";

const OFF = {
	programVisible: false,
	exhibitorsEnabled: false,
	feeEnabled: false,
	financesEnabled: false,
	hasDocuments: false,
};
const ON = {
	programVisible: true,
	exhibitorsEnabled: true,
	feeEnabled: true,
	financesEnabled: true,
	hasDocuments: true,
};

const item = (over: Partial<NavItem>): NavItem => ({
	name: "X",
	href: "/x",
	icon: () => null,
	...over,
});

describe("isNavItemVisible", () => {
	it("shows ungated items regardless of gates", () => {
		expect(isNavItemVisible(item({}), OFF)).toBe(true);
	});

	it("hides a gated item until its gate is on", () => {
		const finances = item({ requiresFinancesEnabled: true });
		expect(isNavItemVisible(finances, OFF)).toBe(false);
		expect(isNavItemVisible(finances, ON)).toBe(true);
		expect(isNavItemVisible(finances, { ...OFF, financesEnabled: true })).toBe(
			true,
		);
	});

	it("requires every gate an item declares", () => {
		const both = item({ requiresFeeEnabled: true, requiresDocuments: true });
		expect(isNavItemVisible(both, { ...OFF, feeEnabled: true })).toBe(false);
		expect(
			isNavItemVisible(both, { ...OFF, feeEnabled: true, hasDocuments: true }),
		).toBe(true);
	});
});

describe("isNavItemActive", () => {
	it("matches exact path and sub-paths, but never external", () => {
		expect(isNavItemActive(item({ href: "/admin" }), "/admin")).toBe(true);
		expect(isNavItemActive(item({ href: "/admin" }), "/admin/users")).toBe(
			true,
		);
		expect(isNavItemActive(item({ href: "/admin" }), "/other")).toBe(false);
		expect(isNavItemActive(item({ href: "/x", external: true }), "/x")).toBe(
			false,
		);
	});

	it("matches root only exactly, not as a prefix", () => {
		expect(isNavItemActive(item({ href: "/" }), "/")).toBe(true);
		expect(isNavItemActive(item({ href: "/" }), "/admin")).toBe(false);
	});
});
