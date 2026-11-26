// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useMultiStep } from "./use-multi-step";

describe("useMultiStep", () => {
	it("advances one step when next fires again while validation is pending", async () => {
		const pending: ((ok: boolean) => void)[] = [];
		const { result } = renderHook(() =>
			useMultiStep({
				totalSteps: 3,
				validateStep: () =>
					new Promise<boolean>((resolve) => {
						pending.push(resolve);
					}),
			}),
		);

		await act(async () => {
			const first = result.current.next();
			const second = result.current.next();
			for (const resolve of pending) resolve(true);
			await Promise.all([first, second]);
		});

		expect(result.current.currentStep).toBe(2);
	});
});
