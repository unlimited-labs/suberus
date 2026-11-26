import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = {
	file: { findUnique: vi.fn() },
	review: { findUnique: vi.fn() },
};

vi.mock("@/shared/server/db.server", () => ({ prisma: prismaMock }));

const { checkFileAccess } = await import("./files");

const fileOf = (submission: {
	userId: string;
	authors: { userId: string | null }[];
}) => ({
	id: "f1",
	storageKey: "k",
	fileName: "Jan_Kowalski.pdf",
	originalName: "Jan_Kowalski.pdf",
	mimeType: "application/pdf",
	size: 1,
	submissionVersions: [
		{
			version: 1,
			submission: {
				id: "s1",
				type: "FULL_PAPER",
				...submission,
				reviewAssignments: [{ reviewerId: "reviewer" }],
			},
		},
	],
});

beforeEach(() => {
	vi.clearAllMocks();
	prismaMock.file.findUnique.mockResolvedValue(
		fileOf({ userId: "owner", authors: [{ userId: "coauthor" }] }),
	);
});

describe("checkFileAccess", () => {
	it("marks a reviewer's access with the submission type and version", async () => {
		const result = await checkFileAccess("f1", "reviewer", "REVIEWER");

		expect(result.authorized).toBe(true);
		expect(result.blindAs).toEqual({
			hide: "author",
			submissionType: "FULL_PAPER",
			version: 1,
		});
	});

	it("does not mark an author's access", async () => {
		const result = await checkFileAccess("f1", "coauthor", "AUTHOR");

		expect(result.authorized).toBe(true);
		expect(result.blindAs).toBeNull();
	});

	it("does not mark access for a reviewer who also co-authored it", async () => {
		prismaMock.file.findUnique.mockResolvedValue(
			fileOf({ userId: "owner", authors: [{ userId: "reviewer" }] }),
		);

		const result = await checkFileAccess("f1", "reviewer", "REVIEWER");

		expect(result.blindAs).toBeNull();
	});

	describe("on a review attachment", () => {
		beforeEach(() => {
			prismaMock.file.findUnique
				.mockResolvedValueOnce({
					...fileOf({ userId: "owner", authors: [] }),
					submissionVersions: [],
				})
				.mockResolvedValueOnce({ entityType: "REVIEW", entityId: "rev1" });
			prismaMock.review.findUnique.mockResolvedValue({
				reviewerId: "reviewer",
				submission: {
					type: "ABSTRACT",
					userId: "owner",
					authors: [],
					reviewAssignments: [{ reviewerId: "reviewer" }],
				},
			});
		});

		it("marks the author's access so the reviewer can be hidden", async () => {
			const result = await checkFileAccess("f1", "owner", "AUTHOR");

			expect(result.authorized).toBe(true);
			expect(result.blindAs).toEqual({
				hide: "reviewer",
				submissionType: "ABSTRACT",
			});
		});

		it("does not mark the uploading reviewer's own access", async () => {
			const result = await checkFileAccess("f1", "reviewer", "REVIEWER");

			expect(result.authorized).toBe(true);
			expect(result.blindAs).toBeNull();
		});
	});
});
