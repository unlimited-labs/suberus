// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FormulaInput, isFormula, sanitizeMath } from "./formula-input";

describe("isFormula", () => {
	it("is true for expressions with operators/parens", () => {
		expect(isFormula("2*250")).toBe(true);
		expect(isFormula("(1+2)")).toBe(true);
		expect(isFormula("10-3")).toBe(true);
	});
	it("is false for plain values and empty", () => {
		expect(isFormula("500")).toBe(false);
		expect(isFormula("1000.5")).toBe(false);
		expect(isFormula("")).toBe(false);
	});
});

describe("sanitizeMath", () => {
	it("drops letters and converts commas to dots", () => {
		expect(sanitizeMath("12a*3,5")).toBe("12*3.5");
		expect(sanitizeMath("abc")).toBe("");
		expect(sanitizeMath("(100+20)*3")).toBe("(100+20)*3");
	});
});

const evaluate = (expr: string) => {
	const map: Record<string, number> = { "2*250": 500, "100+20": 120 };
	return map[expr.trim()] ?? 0;
};

afterEach(cleanup);

describe("FormulaInput", () => {
	it("shows the evaluated result for a formula", () => {
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

	it("omits the result for a plain value (not a formula)", () => {
		const { queryByTestId } = render(
			<FormulaInput
				value="500"
				onValueChange={() => {}}
				evaluate={evaluate}
				format={String}
				resultTestId="result"
			/>,
		);
		expect(queryByTestId("result")).toBeNull();
	});

	it("omits the result when showResult is false", () => {
		const { queryByTestId } = render(
			<FormulaInput
				value="2*250"
				onValueChange={() => {}}
				evaluate={evaluate}
				format={String}
				showResult={false}
				resultTestId="result"
			/>,
		);
		expect(queryByTestId("result")).toBeNull();
	});

	it("strips letters and converts commas before reporting changes", () => {
		const onValueChange = vi.fn();
		const { getByRole } = render(
			<FormulaInput
				value=""
				onValueChange={onValueChange}
				evaluate={evaluate}
				format={String}
			/>,
		);
		fireEvent.change(getByRole("textbox"), {
			target: { value: "12a*3,5" },
		});
		expect(onValueChange).toHaveBeenCalledWith("12*3.5");
	});
});
