import { describe, expect, it } from "vitest";
import {
	affiliationDisplay,
	authorCardClassName,
	presenterAriaLabel,
	presenterBadgeClassName,
	presenterButtonClassName,
	presenterLabel,
} from "./author-card-styles";

describe("authorCardClassName", () => {
	const base = { isPresenter: false, isDragging: false, isDragOverlay: false };

	it("uses the presenter border when presenting", () => {
		expect(authorCardClassName({ ...base, isPresenter: true })).toContain(
			"border-primary/30",
		);
		expect(authorCardClassName(base)).toContain("border-border/50");
	});

	it("hides the source row while dragging (but not the overlay)", () => {
		expect(authorCardClassName({ ...base, isDragging: true })).toContain(
			"opacity-0",
		);
		expect(
			authorCardClassName({ ...base, isDragging: true, isDragOverlay: true }),
		).not.toContain("opacity-0");
	});

	it("styles the drag overlay", () => {
		expect(authorCardClassName({ ...base, isDragOverlay: true })).toContain(
			"rotate-2",
		);
	});
});

describe("presenter badge / button classes", () => {
	it("switches on presenter state", () => {
		expect(presenterBadgeClassName(true)).toContain("text-primary");
		expect(presenterBadgeClassName(false)).toContain("text-muted-foreground");
		expect(presenterButtonClassName(true)).toContain("text-primary");
		expect(presenterButtonClassName(false)).toContain("text-muted-foreground");
	});
});

describe("presenter labels", () => {
	it("returns the right visible label", () => {
		expect(presenterLabel(true)).toBe("Presenter");
		expect(presenterLabel(false)).toBe("Set presenter");
	});

	it("returns the right aria label", () => {
		expect(presenterAriaLabel(true)).toBe("Presenting author");
		expect(presenterAriaLabel(false)).toBe("Set as presenter");
	});
});

describe("affiliationDisplay", () => {
	it("shows the name or an em dash placeholder", () => {
		expect(affiliationDisplay("MIT")).toBe("MIT");
		expect(affiliationDisplay("")).toBe("—");
		expect(affiliationDisplay(null)).toBe("—");
		expect(affiliationDisplay(undefined)).toBe("—");
	});
});
