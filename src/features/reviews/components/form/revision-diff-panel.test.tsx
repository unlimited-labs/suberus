// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
	Link: ({ children, ...props }: { children: ReactNode }) => (
		<a {...props}>{children}</a>
	),
}));

import { RevisionDiffPanel } from "./revision-diff-panel";

afterEach(cleanup);

const base = {
	previous: {
		title: "Old title",
		content: "Old body",
		keywords: ["alpha"],
	},
	title: "Old title",
	content: "Old body",
	keywords: ["alpha"],
	assignmentId: "a1",
};

describe("RevisionDiffPanel", () => {
	it("always shows the compare link and title", () => {
		render(<RevisionDiffPanel {...base} isFileSubmission={false} />);
		expect(screen.getByTestId("reviewer-compare-link")).toBeTruthy();
		expect(screen.getByText("Title")).toBeTruthy();
	});

	describe("TEXT submission", () => {
		it("renders a content text diff when the body changed", () => {
			render(
				<RevisionDiffPanel
					{...base}
					content="New body"
					isFileSubmission={false}
				/>,
			);
			expect(screen.getByTestId("text-diff")).toBeTruthy();
			expect(screen.queryByText("Content unchanged.")).toBeNull();
			expect(screen.queryByTestId("reviewer-file-change-notice")).toBeNull();
		});

		it("shows 'Content unchanged.' when the body is identical", () => {
			render(<RevisionDiffPanel {...base} isFileSubmission={false} />);
			expect(screen.getByText("Content unchanged.")).toBeTruthy();
		});
	});

	describe("FILE submission", () => {
		it("never shows the misleading text content block; flags the changed file", () => {
			render(
				<RevisionDiffPanel
					{...base}
					file={{ id: "f2" }}
					isFileSubmission
					previous={{ ...base.previous, file: { id: "f1" } }}
				/>,
			);
			expect(screen.queryByText("Content unchanged.")).toBeNull();
			const notice = screen.getByTestId("reviewer-file-change-notice");
			expect(notice.getAttribute("data-changed")).toBe("true");
			expect(notice.textContent).toMatch(/file changed/i);
		});

		it("reports an unchanged file when the file id is the same", () => {
			render(
				<RevisionDiffPanel
					{...base}
					file={{ id: "f1" }}
					isFileSubmission
					previous={{ ...base.previous, file: { id: "f1" } }}
				/>,
			);
			const notice = screen.getByTestId("reviewer-file-change-notice");
			expect(notice.getAttribute("data-changed")).toBe("false");
			expect(notice.textContent).toMatch(/file unchanged/i);
		});
	});

	describe("keywords", () => {
		it("diffs keyword changes", () => {
			render(
				<RevisionDiffPanel
					{...base}
					isFileSubmission={false}
					keywords={["alpha", "beta"]}
				/>,
			);
			const diff = screen.getByTestId("keywords-diff");
			expect(diff.textContent).toMatch(/beta/);
			expect(diff.querySelector('[data-diff-status="added"]')).toBeTruthy();
		});

		it("shows 'Keywords unchanged.' when both versions have none", () => {
			render(
				<RevisionDiffPanel
					{...base}
					isFileSubmission={false}
					keywords={[]}
					previous={{ ...base.previous, keywords: [] }}
				/>,
			);
			expect(screen.getByText("Keywords unchanged.")).toBeTruthy();
		});
	});
});
