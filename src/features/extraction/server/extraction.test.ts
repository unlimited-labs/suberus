import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/extraction/server/pdf-api", () => ({
	checkPdfApiHealth: async () => ({ status: "healthy", message: "Connected" }),
	getPdfApiMarkdown: async () => null,
}));
vi.mock("@/shared/server/llm", () => ({ checkLlmHealth: vi.fn() }));
vi.mock("./extraction-llm", () => ({ extractWithLlm: vi.fn() }));

import { extractFromPdf } from "./extraction";

describe("extractFromPdf", () => {
	// A busy (503) pdf-api must fail the job, not complete it with an empty form.
	it("fails when pdf-api returns no markdown", async () => {
		await expect(
			extractFromPdf(Buffer.from("%PDF"), "paper.pdf", {
				heuristic: false,
				ai: true,
			}),
		).rejects.toThrow(/service is busy/);
	});
});
