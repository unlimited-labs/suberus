import { beforeEach, describe, expect, it, vi } from "vitest";

const tx = {
	user: { findUniqueOrThrow: vi.fn(), update: vi.fn() },
	activityLog: { create: vi.fn(), findFirst: vi.fn() },
};
vi.mock("@/shared/server/db.server", () => ({
	prisma: { $transaction: (run: (client: typeof tx) => unknown) => run(tx) },
}));

const { acknowledgeBillingChange } = await import("./billing-after-payment");

beforeEach(() => vi.clearAllMocks());

describe("acknowledgeBillingChange", () => {
	const changedAt = new Date("2026-11-08T10:00:00Z");

	it("clears the flag and logs who acknowledged which change", async () => {
		tx.user.findUniqueOrThrow.mockResolvedValue({
			billingChangedAfterPaymentAt: changedAt,
		});
		tx.activityLog.findFirst.mockResolvedValue(null);

		await acknowledgeBillingChange("u1", "admin", changedAt);

		expect(tx.user.update).toHaveBeenCalledWith({
			where: { id: "u1" },
			data: { billingChangedAfterPaymentAt: null },
		});
		expect(tx.activityLog.create.mock.calls[0][0].data).toMatchObject({
			type: "USER_BILLING_CHANGE_ACKNOWLEDGED",
			userId: "u1",
			performedBy: "admin",
			detail: { changedAt: changedAt.toISOString() },
		});
	});

	it("keeps the flag from the first edit the admin did not see", async () => {
		const unseenAt = new Date("2026-11-08T12:00:00Z");
		tx.user.findUniqueOrThrow.mockResolvedValue({
			billingChangedAfterPaymentAt: changedAt,
		});
		tx.activityLog.findFirst.mockResolvedValue({ createdAt: unseenAt });

		await acknowledgeBillingChange("u1", "admin", changedAt);

		expect(tx.activityLog.findFirst.mock.calls[0][0].where.createdAt).toEqual({
			gte: changedAt,
			gt: changedAt,
		});
		expect(tx.user.update).toHaveBeenCalledWith({
			where: { id: "u1" },
			data: { billingChangedAfterPaymentAt: unseenAt },
		});
	});

	it("does nothing when there is no flag to acknowledge", async () => {
		tx.user.findUniqueOrThrow.mockResolvedValue({
			billingChangedAfterPaymentAt: null,
		});

		await acknowledgeBillingChange("u1", "admin", changedAt);

		expect(tx.user.update).not.toHaveBeenCalled();
		expect(tx.activityLog.create).not.toHaveBeenCalled();
	});
});
