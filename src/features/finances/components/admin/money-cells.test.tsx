// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MoneyCells } from "./money-cells";

afterEach(cleanup);

const base = {
	netValue: "925.93",
	grossValue: "1000",
	showNetResult: true,
	showGrossResult: false,
	vat: 23 as number | null,
	vatRates: [
		{ id: "vat-8", rate: 8 },
		{ id: "vat-23", rate: 23 },
	],
	vatAmount: 74.07,
	currency: "EUR",
	testIdPrefix: "expense",
	index: 0,
	onNetChange: () => {},
	onGrossChange: () => {},
	onVatChange: () => {},
};

describe("MoneyCells", () => {
	it("renders net, gross and a pill per rate plus No VAT", () => {
		const { getByTestId } = render(<MoneyCells {...base} />);
		expect((getByTestId("expense-net-0") as HTMLInputElement).value).toBe(
			"925.93",
		);
		expect((getByTestId("expense-gross-0") as HTMLInputElement).value).toBe(
			"1000",
		);
		expect(getByTestId("expense-vat-none-0")).toBeTruthy();
		expect(getByTestId("expense-vat-8-0")).toBeTruthy();
		expect(getByTestId("expense-vat-23-0")).toBeTruthy();
	});

	it("marks the active rate and reports pill clicks", () => {
		const onVatChange = vi.fn();
		const { getByTestId } = render(
			<MoneyCells {...base} onVatChange={onVatChange} />,
		);
		expect(getByTestId("expense-vat-23-0").getAttribute("aria-pressed")).toBe(
			"true",
		);
		fireEvent.click(getByTestId("expense-vat-8-0"));
		expect(onVatChange).toHaveBeenCalledWith(8);
		fireEvent.click(getByTestId("expense-vat-none-0"));
		expect(onVatChange).toHaveBeenCalledWith(null);
	});

	it("shows the VAT amount only when a rate is set", () => {
		const withVat = render(<MoneyCells {...base} />);
		expect(withVat.getByTestId("expense-vatamt-0").textContent).toContain("74");
		cleanup();
		const noVat = render(<MoneyCells {...base} vat={null} />);
		expect(noVat.queryByTestId("expense-vatamt-0")).toBeNull();
	});
});
