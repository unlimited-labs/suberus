import { describe, expect, it } from "vitest";
import { llmStatusDotClass } from "./program-tab-helpers";

describe("llmStatusDotClass", () => {
	it("is green when healthy, yellow when misconfigured, red otherwise", () => {
		expect(llmStatusDotClass("healthy")).toBe("bg-green-500");
		expect(llmStatusDotClass("misconfigured")).toBe("bg-yellow-500");
		expect(llmStatusDotClass("unavailable")).toBe("bg-red-500");
		expect(llmStatusDotClass("anything-else")).toBe("bg-red-500");
	});
});
