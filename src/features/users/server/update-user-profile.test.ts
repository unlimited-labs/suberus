import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = {
	user: { findUnique: vi.fn(), update: vi.fn() },
};

vi.mock("@/shared/server/db.server", () => ({ prisma: prismaMock }));
vi.mock("@/features/activity-log/server/activity-log", () => ({
	logActivity: vi.fn(),
	logActivityTx: vi.fn(),
}));
vi.mock("@/features/settings/server/settings", () => ({ getSetting: vi.fn() }));
vi.mock("@/shared/server/storage", () => ({ deleteFile: vi.fn() }));
vi.mock("@/shared/server/link-coauthors", () => ({
	linkCoAuthorsByEmail: vi.fn(),
}));
vi.mock("@/shared/server/affiliations", () => ({
	upsertAffiliation: vi.fn().mockResolvedValue({ id: "aff-1" }),
}));
vi.mock("@/features/settings/server/vat-id-check", () => ({
	checkVatIdInBackground: vi.fn(),
}));
vi.mock("@/logger.ts", () => ({
	logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const { updateUserProfile } = await import("./users");

function savedData() {
	return prismaMock.user.update.mock.calls[0][0].data;
}

beforeEach(() => {
	vi.clearAllMocks();
	prismaMock.user.findUnique.mockResolvedValue({ email: "old@x.com" });
	prismaMock.user.update.mockResolvedValue({ vatId: null });
});

describe("updateUserProfile (PATCH)", () => {
	it("leaves every omitted field untouched", async () => {
		await updateUserProfile("u1", { billingText: "ACME" });

		expect(savedData()).toEqual({ billingText: "ACME" });
	});

	it("clears a field sent as an empty string", async () => {
		await updateUserProfile("u1", {
			billingText: "",
			title: "",
			affiliation: "",
		});

		expect(savedData()).toEqual({
			billingText: null,
			title: null,
			affiliation: { disconnect: true },
		});
	});

	it("changes the email only when one is sent", async () => {
		prismaMock.user.findUnique
			.mockResolvedValueOnce({ email: "old@x.com" })
			.mockResolvedValueOnce(null);

		await updateUserProfile("u1", { email: "new@x.com" });

		expect(savedData()).toEqual({
			email: "new@x.com",
			emailVerified: false,
		});
	});
});
