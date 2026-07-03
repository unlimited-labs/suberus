// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ExpenseFilter, ExpenseSort } from "@/features/finances/calc";
import { ExpenseToolbar } from "./expense-toolbar";

afterEach(cleanup);

const base = {
	stats: {
		all: { count: 3, sum: 600 },
		unpaid: { count: 2, sum: 400 },
		overdue: { count: 1, sum: 200 },
		paid: { count: 1, sum: 200 },
	},
	filter: "all" as ExpenseFilter,
	onFilter: () => {},
	sort: "manual" as ExpenseSort,
	onSort: () => {},
	currency: "EUR",
};

describe("ExpenseToolbar", () => {
	it("renders a chip per status with its count", () => {
		const { getByTestId } = render(<ExpenseToolbar {...base} />);
		expect(getByTestId("expense-filter-all").textContent).toContain("3");
		expect(getByTestId("expense-filter-unpaid").textContent).toContain("2");
		expect(getByTestId("expense-filter-overdue").textContent).toContain("1");
		expect(getByTestId("expense-sort")).toBeTruthy();
	});

	it("marks the active filter and reports clicks", () => {
		const onFilter = vi.fn();
		const { getByTestId } = render(
			<ExpenseToolbar {...base} filter="paid" onFilter={onFilter} />,
		);
		fireEvent.click(getByTestId("expense-filter-overdue"));
		expect(onFilter).toHaveBeenCalledWith("overdue");
	});
});
