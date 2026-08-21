import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = { submission: { findUnique: vi.fn() } };

vi.mock("@/shared/server/db.server", () => ({ prisma: prismaMock }));
vi.mock("@/features/settings/server/settings", () => ({
	getSetting: vi.fn(),
}));
vi.mock("@/features/submissions/server/create-submission", () => ({
	attachFileToVersion: vi.fn(),
}));
vi.mock("@/features/submissions/server/upload-link", () => ({
	readUploadToken: vi.fn(),
}));

const { getSetting } = await import("@/features/settings/server/settings");
const { DEFAULT_FULL_PAPER_CONFIG } =
	await import("@/features/settings/defaults");
const { assertAcceptsFile } = await import("./upload-target");

const draft = {
	id: "sub-1",
	type: "FULL_PAPER",
	status: "DRAFT",
	userId: "user-1",
	currentVersion: { version: 2 },
};

beforeEach(() => {
	vi.mocked(getSetting).mockResolvedValue({
		...DEFAULT_FULL_PAPER_CONFIG,
		contentFormat: "FILE",
	});
	prismaMock.submission.findUnique.mockResolvedValue(draft);
});

async function statusOf(promise: Promise<unknown>): Promise<number> {
	try {
		await promise;
		return 200;
	} catch (error) {
		if (error instanceof Response) return error.status;
		throw error;
	}
}

describe("assertAcceptsFile", () => {
	it("passes a FILE-type draft through", async () => {
		await expect(assertAcceptsFile("sub-1")).resolves.toMatchObject({
			id: "sub-1",
		});
	});

	it("distinguishes a missing submission from a closed one", async () => {
		prismaMock.submission.findUnique.mockResolvedValue(null);
		expect(await statusOf(assertAcceptsFile("gone"))).toBe(404);

		prismaMock.submission.findUnique.mockResolvedValue({
			...draft,
			status: "UNDER_REVIEW",
		});
		expect(await statusOf(assertAcceptsFile("sub-1"))).toBe(409);
	});

	it("refuses a text type", async () => {
		vi.mocked(getSetting).mockResolvedValue({
			...DEFAULT_FULL_PAPER_CONFIG,
			contentFormat: "TEXT",
		});
		expect(await statusOf(assertAcceptsFile("sub-1"))).toBe(409);
	});
});
