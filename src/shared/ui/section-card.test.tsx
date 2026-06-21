// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SectionCard } from "./section-card";

describe("SectionCard", () => {
	it("renders the title and children (default variant, flat ring)", () => {
		const { container } = render(
			<SectionCard title="Information">body</SectionCard>,
		);
		expect(screen.getByText("Information")).toBeTruthy();
		expect(screen.getByText("body")).toBeTruthy();
		const root = container.querySelector('[data-slot="card"]');
		expect(root?.className).toContain("ring-1");
		expect(root?.className).not.toContain("rounded-2xl");
	});

	it("applies the outlined surface (rounded-2xl + shadow, no ring)", () => {
		const { container } = render(
			<SectionCard variant="outlined" title="Actions">
				body
			</SectionCard>,
		);
		const root = container.querySelector('[data-slot="card"]');
		expect(root?.className).toContain("rounded-2xl");
		expect(root?.className).toContain("shadow-xl");
		expect(root?.className).toContain("ring-0");
	});

	it("applies the elevated surface", () => {
		const { container } = render(
			<SectionCard variant="elevated" title="Decision">
				body
			</SectionCard>,
		);
		const root = container.querySelector('[data-slot="card"]');
		expect(root?.className).toContain("shadow-2xl");
		expect(root?.className).toContain("ring-0");
	});

	it("collapsible keeps the variant and shows a toggle", () => {
		const { container } = render(
			<SectionCard collapsible variant="elevated" title="Editorial Decision">
				body
			</SectionCard>,
		);
		expect(screen.getByText("Editorial Decision")).toBeTruthy();
		const root = container.querySelector('[data-slot="card"]');
		expect(root?.className).toContain("rounded-2xl");
	});
});
