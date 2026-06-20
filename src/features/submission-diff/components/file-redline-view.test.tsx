// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useQueryMock = vi.fn();
vi.mock("@tanstack/react-query", () => ({ useQuery: () => useQueryMock() }));
vi.mock("@/features/submission-diff/api", () => ({
	versionRedlineQueryOptions: () => ({ queryKey: [], queryFn: vi.fn() }),
}));

import { FileRedlineView } from "./file-redline-view";

const props = {
	oldVersionId: "o",
	newVersionId: "n",
	oldLabel: "v1",
	newLabel: "v2",
} as const;

describe("FileRedlineView", () => {
	beforeEach(() => useQueryMock.mockReset());

	it("shows a loading state while pending", () => {
		useQueryMock.mockReturnValue({ data: undefined, isPending: true });
		render(<FileRedlineView {...props} layout="inline" />);
		expect(screen.getByText(/loading file redline/i)).toBeTruthy();
	});

	it("shows the unavailable notice (no file / not processed yet)", () => {
		useQueryMock.mockReturnValue({
			data: { status: "unavailable" },
			isPending: false,
		});
		render(<FileRedlineView {...props} layout="inline" />);
		expect(screen.getByText(/hasn't been processed yet/i)).toBeTruthy();
	});

	it("shows the format-changed notice", () => {
		useQueryMock.mockReturnValue({
			data: { status: "format-changed" },
			isPending: false,
		});
		render(<FileRedlineView {...props} layout="inline" />);
		expect(screen.getByTestId("file-redline-format-changed")).toBeTruthy();
	});

	it("renders the inline redline frame when ready", () => {
		useQueryMock.mockReturnValue({
			data: { status: "ready", html: "<p>x</p>", insertions: 2, deletions: 1 },
			isPending: false,
		});
		render(<FileRedlineView {...props} layout="inline" />);
		expect(screen.getByTestId("file-redline")).toBeTruthy();
		expect(screen.getByTitle("File redline")).toBeTruthy();
	});

	it("renders both reconstructed document frames in split layout", () => {
		useQueryMock.mockReturnValue({
			data: {
				status: "ready",
				html: "<p><ins>new</ins><del>old</del></p>",
				insertions: 1,
				deletions: 1,
			},
			isPending: false,
		});
		render(<FileRedlineView {...props} layout="split" />);
		expect(screen.getByTestId("file-redline-split")).toBeTruthy();
		expect(screen.getByTitle("File v1")).toBeTruthy();
		expect(screen.getByTitle("File v2")).toBeTruthy();
	});
});
