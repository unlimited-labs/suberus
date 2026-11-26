// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KeywordsInput } from "./keywords-input";

afterEach(cleanup);

describe("KeywordsInput", () => {
	it("targets the input instead of removing a keyword when the box is clicked", () => {
		const onChange = vi.fn();
		const { getByTestId, getByRole } = render(
			<KeywordsInput onChange={onChange} value={["graphene", "lasers"]} />,
		);

		const box = getByTestId("keywords-box");
		fireEvent.click(box);

		expect(onChange).not.toHaveBeenCalled();
		expect(box instanceof HTMLLabelElement && box.control).toBe(
			getByRole("textbox", { name: "Keywords" }),
		);
	});

	it("still removes a keyword from its own button", () => {
		const onChange = vi.fn();
		const { getByRole } = render(
			<KeywordsInput onChange={onChange} value={["graphene", "lasers"]} />,
		);

		fireEvent.click(getByRole("button", { name: "Remove lasers" }));

		expect(onChange).toHaveBeenCalledWith(["graphene"]);
	});

	it("ignores Enter while an IME composition is still open", () => {
		const onChange = vi.fn();
		const { getByRole } = render(
			<KeywordsInput onChange={onChange} value={[]} />,
		);
		const input = getByRole("textbox", { name: "Keywords" });
		fireEvent.change(input, { target: { value: "にほん" } });

		fireEvent.keyDown(input, { key: "Enter", isComposing: true });
		expect(onChange).not.toHaveBeenCalled();

		fireEvent.keyDown(input, { key: "Enter" });
		expect(onChange).toHaveBeenCalledWith(["にほん"]);
	});
});
