import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = {
	reviewAssignment: { findUnique: vi.fn() },
	file: { findFirst: vi.fn() },
};

vi.mock("@/shared/server/db.server", () => ({ prisma: prismaMock }));
vi.mock("@/features/activity-log/server/activity-log", () => ({
	logActivity: vi.fn(),
}));
vi.mock("@/logger.ts", () => ({
	logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("@/env.ts", () => ({ env: { APP_BASE_URL: "http://localhost" } }));
vi.mock("@/shared/server/email", () => ({ sendEmail: vi.fn() }));
vi.mock("@/features/workflow/server/workflow", () => ({
	checkAndTriggerReviewCompletion: vi.fn(),
	validateAssignmentTransition: vi.fn(),
}));
vi.mock("@/features/settings/server/settings", () => ({
	getSetting: vi.fn(),
}));

const { getSetting } = await import("@/features/settings/server/settings");
const { getAssignmentForReview } = await import("./reviews");

const authorFile = (id: string) => ({
	id,
	fileName: "Jan_Kowalski.pdf",
	originalName: "Jan_Kowalski.pdf",
	mimeType: "application/pdf",
	size: 100,
});

const version = (n: number) => ({
	id: `v${n}`,
	version: n,
	title: `Title v${n}`,
	content: "",
	createdAt: new Date(0),
	file: authorFile(`f${n}`),
	keywordsSnapshot: [],
});

beforeEach(() => {
	vi.clearAllMocks();
	prismaMock.reviewAssignment.findUnique.mockResolvedValue({
		id: "a1",
		submissionId: "s1",
		reviewerId: "r1",
		round: 2,
		status: "PENDING",
		deadline: null,
		review: null,
		submission: {
			id: "s1",
			title: "Title v2",
			content: "",
			type: "ABSTRACT",
			authors: [],
			keywords: [],
			currentVersion: version(2),
			versions: [version(2), version(1)],
		},
	});
	vi.mocked(getSetting).mockResolvedValue({
		reviewMode: "DOUBLE_BLIND",
		contentFormat: "PLAIN",
		enableScoring: false,
		scoringCriteria: [],
		enableConfidenceLevel: false,
		enableReviewAttachment: true,
	});
});

describe("getAssignmentForReview in double-blind review", () => {
	it("hides the author name in the previous version file", async () => {
		const result = await getAssignmentForReview("a1", "r1");

		expect(result?.submission.previousVersion?.file).toMatchObject({
			id: "f1",
			fileName: "v1.pdf",
			originalName: "v1.pdf",
		});
	});
});
