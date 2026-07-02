// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FormulaInput } from "./formula-input";

afterEach(cleanup);

const evaluate = (expr: string) => {
	const map: Record<string, number> = { "2*250": 500, "100+20": 120 };
	return map[expr.trim()] ?? 0;
};

describe("FormulaInput", () => {
	it("shows the expression in the box and its evaluated value", () => {
		const { getByRole, getByTestId } = render(
			<FormulaInput
				value="2*250"
				onValueChange={() => {}}
				evaluate={evaluate}
				format={(n) => n.toFixed(2)}
				resultTestId="result"
			/>,
		);
		expect((getByRole("textbox") as HTMLInputElement).value).toBe("2*250");
		expect(getByTestId("result").textContent).toBe("= 500.00");
	});

	it("hides the result when the expression is empty", () => {
		const { getByTestId } = render(
			<FormulaInput
				value="   "
				onValueChange={() => {}}
				evaluate={evaluate}
				resultTestId="result"
			/>,
		);
		expect(getByTestId("result").textContent).toBe("");
	});

	it("reports typed changes via onValueChange", () => {
		const onValueChange = vi.fn();
		const { getByRole } = render(
			<FormulaInput
				value=""
				onValueChange={onValueChange}
				evaluate={evaluate}
			/>,
		);
		fireEvent.change(getByRole("textbox"), { target: { value: "100+20" } });
		expect(onValueChange).toHaveBeenCalledWith("100+20");
	});
});
