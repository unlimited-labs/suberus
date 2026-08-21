// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DueCell } from "./due-cell";

afterEach(cleanup);

const base = {
	value: "2026-08-01",
	onChange: () => {},
	overdue: false,
	days: 3 as number | null,
	paid: false,
	testIdPrefix: "expense",
	index: 0,
};

describe("DueCell", () => {
	it("shows the date and an 'in Nd' hint for upcoming dates", () => {
		const { getByTestId, getByText } = render(<DueCell {...base} />);
		expect((getByTestId("expense-due-0") as HTMLInputElement).value).toBe(
			"2026-08-01",
		);
		expect(getByText("in 3d")).toBeTruthy();
	});

	it("shows an overdue badge when overdue", () => {
		const { getByTestId } = render(<DueCell {...base} days={-5} overdue />);
		expect(getByTestId("expense-overdue-0").textContent).toContain(
			"5d overdue",
		);
	});

	it("shows 'due today' at 0 days and nothing without a date", () => {
		const today = render(<DueCell {...base} days={0} />);
		expect(today.getByText("due today")).toBeTruthy();
		cleanup();
		const none = render(<DueCell {...base} days={null} />);
		expect(none.queryByTestId("expense-overdue-0")).toBeNull();
	});
});
