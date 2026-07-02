// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FormulaInput } from "./formula-input";

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
				showResult={false}
				resultTestId="result"
			/>,
		);
		expect(queryByTestId("result")).toBeNull();
	});

	it("strips letters and converts commas before reporting changes", () => {
		const onValueChange = vi.fn();
		const { getByRole } = render(
			<FormulaInput value="" onValueChange={onValueChange} evaluate={evaluate} />,
		);
		fireEvent.change(getByRole("textbox"), {
			target: { value: "12a*3,5" },
		});
		expect(onValueChange).toHaveBeenCalledWith("12*3.5");
	});
});
