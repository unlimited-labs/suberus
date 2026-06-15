import { describe, expect, it } from "vitest";
import { getDeadlineDisplay } from "./review-deadline";

describe("getDeadlineDisplay", () => {
	it("marks completed assignments regardless of days remaining", () => {
		expect(getDeadlineDisplay("COMPLETED", -5, "Jan 1")).toEqual({
			variant: "completed",
			label: "Completed on Jan 1",
		});
	});

	it("marks a past deadline as overdue with absolute day count", () => {
		expect(getDeadlineDisplay("PENDING", -3, "Jan 1")).toEqual({
			variant: "overdue",
			label: "3d overdue (Jan 1)",
		});
	});

	it("marks OVERDUE status as overdue even without a negative day count", () => {
		expect(getDeadlineDisplay("OVERDUE", null, "Jan 1")).toEqual({
			variant: "overdue",
			label: "0d overdue (Jan 1)",
		});
	});

	it("marks deadlines within 3 days as urgent", () => {
		expect(getDeadlineDisplay("PENDING", 2, "Jan 5")).toEqual({
			variant: "urgent",
			label: "2d left (Jan 5)",
		});
		expect(getDeadlineDisplay("PENDING", 0, "Jan 5").variant).toBe("urgent");
		expect(getDeadlineDisplay("PENDING", 3, "Jan 5").variant).toBe("urgent");
	});

	it("marks deadlines further out as normal", () => {
		expect(getDeadlineDisplay("PENDING", 4, "Jan 9")).toEqual({
			variant: "normal",
			label: "4d left (Jan 9)",
		});
	});
});
