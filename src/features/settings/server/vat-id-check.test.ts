import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = {
	vatIdCheck: { findUnique: vi.fn(), upsert: vi.fn() },
	$executeRaw: vi.fn(),
};
const boss = { send: vi.fn() };
const registries = {
	queryVies: vi.fn(),
	queryMfWhiteList: vi.fn(),
	querySwissUid: vi.fn(),
	queryBrreg: vi.fn(),
};

vi.mock("@/shared/server/db.server", () => ({ prisma: prismaMock }));
vi.mock("@/shared/server/queue", () => ({ getBoss: async () => boss }));
vi.mock("@/features/settings/server/settings", () => ({
	getSetting: vi.fn().mockResolvedValue({ organizerVatId: "" }),
}));
vi.mock("./vies", () => ({ queryVies: registries.queryVies }));
vi.mock("./national-registries", () => ({
	queryMfWhiteList: registries.queryMfWhiteList,
	querySwissUid: registries.querySwissUid,
	queryBrreg: registries.queryBrreg,
}));
vi.mock("@/logger.ts", () => ({
	logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const { checkVatId, purgeOrphanVatIdChecks } = await import("./vat-id-check");

const result = (status: string) => ({
	status,
	registryName: null,
	registryAddress: null,
	requestIdentifier: null,
});

function savedRow() {
	return prismaMock.vatIdCheck.upsert.mock.calls[0][0].create;
}

beforeEach(() => {
	vi.clearAllMocks();
	prismaMock.vatIdCheck.findUnique.mockResolvedValue(null);
	prismaMock.vatIdCheck.upsert.mockImplementation(async ({ create }) => create);
});

describe("checkVatId", () => {
	it("verifies a Polish NIP through the MF white list when VIES does not know it", async () => {
		registries.queryVies.mockResolvedValue(result("NOT_FOUND"));
		registries.queryMfWhiteList.mockResolvedValue(result("VERIFIED"));

		await checkVatId("PL6750001923");

		expect(savedRow()).toMatchObject({ source: "MF", status: "VERIFIED" });
	});

	it("keeps the VIES answer when the MF white list does not confirm either", async () => {
		registries.queryVies.mockResolvedValue(result("NOT_FOUND"));
		registries.queryMfWhiteList.mockResolvedValue(result("NOT_FOUND"));

		await checkVatId("PL6750001923");

		expect(savedRow()).toMatchObject({ source: "VIES", status: "NOT_FOUND" });
	});

	it("routes Swiss and Norwegian numbers to their own registers", async () => {
		registries.querySwissUid.mockResolvedValue(result("VERIFIED"));
		registries.queryBrreg.mockResolvedValue(result("VERIFIED"));

		await checkVatId("CHE116281710");
		await checkVatId("NO970422528");

		expect(registries.queryVies).not.toHaveBeenCalled();
		expect(
			prismaMock.vatIdCheck.upsert.mock.calls.map((c) => c[0].create.source),
		).toEqual(["UID", "BRREG"]);
	});

	it("schedules one background retry per number when the registry is unavailable", async () => {
		registries.queryVies.mockResolvedValue(result("UNAVAILABLE"));

		await checkVatId("DE136695976");
		await vi.waitFor(() => expect(boss.send).toHaveBeenCalledOnce());

		expect(boss.send).toHaveBeenCalledWith(
			"vat-id-retry",
			expect.objectContaining({ vatId: "DE136695976" }),
			expect.objectContaining({
				singletonKey: "DE136695976",
				retryBackoff: true,
			}),
		);
	});

	it("does not schedule another retry from inside the retry job", async () => {
		registries.queryVies.mockResolvedValue(result("UNAVAILABLE"));

		await checkVatId("DE136695976", { fromRetry: true });

		expect(boss.send).not.toHaveBeenCalled();
	});

	it("returns a fresh cached result without calling a registry", async () => {
		prismaMock.vatIdCheck.findUnique.mockResolvedValue({
			vatId: "DE136695976",
			status: "VERIFIED",
			checkedAt: new Date(),
		});

		await checkVatId("DE136695976");

		expect(registries.queryVies).not.toHaveBeenCalled();
	});
});

describe("purgeOrphanVatIdChecks", () => {
	it("deletes rows older than 24 h that no user references", async () => {
		await purgeOrphanVatIdChecks(new Date("2026-11-08T12:00:00Z"));

		const [sql, cutoff] = prismaMock.$executeRaw.mock.calls[0];
		expect(sql.join("?")).toMatch(
			/NOT EXISTS \(SELECT 1 FROM "users" u WHERE u."vatId" = c."vatId"\)/,
		);
		expect(cutoff).toEqual(new Date("2026-11-07T12:00:00Z"));
	});
});
