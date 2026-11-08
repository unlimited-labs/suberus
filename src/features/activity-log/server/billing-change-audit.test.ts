import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/server/db.server", () => ({ prisma: {} }));

const { auditBillingChange } = await import("./billing-change-audit");

const tx = {
	activityLog: { create: vi.fn() },
	user: { updateMany: vi.fn() },
};
// SAFETY: the audit only touches activityLog.create and user.updateMany, both mocked above.
const txClient = tx as unknown as Parameters<typeof auditBillingChange>[0];

const paidBefore = {
	needInvoice: true,
	billingOrganization: "ACME",
	fee: { paid: true },
};
const changedAfter = { needInvoice: true, billingOrganization: "ACME Ltd" };

function audit(overrides: Partial<Parameters<typeof auditBillingChange>[1]>) {
	return auditBillingChange(txClient, {
		userId: "u1",
		performedBy: "u1",
		byParticipant: true,
		before: paidBefore,
		after: changedAfter,
		...overrides,
	});
}

beforeEach(() => vi.clearAllMocks());

describe("auditBillingChange", () => {
	it("logs the diff and flags a participant change after payment at the same time", async () => {
		await audit({});

		const { data } = tx.activityLog.create.mock.calls[0][0];
		expect(data).toMatchObject({
			type: "USER_BILLING_DETAILS_UPDATED",
			userId: "u1",
			performedBy: "u1",
			detail: {
				changes: { billingOrganization: { from: "ACME", to: "ACME Ltd" } },
			},
		});
		expect(tx.user.updateMany).toHaveBeenCalledWith({
			where: { id: "u1", billingChangedAfterPaymentAt: null },
			data: { billingChangedAfterPaymentAt: data.createdAt },
		});
	});

	it("logs an admin change without flagging it", async () => {
		await audit({ performedBy: "admin", byParticipant: false });

		expect(tx.activityLog.create).toHaveBeenCalledOnce();
		expect(tx.user.updateMany).not.toHaveBeenCalled();
	});

	it("does nothing when no billing field changed", async () => {
		await audit({ after: { needInvoice: true, billingOrganization: "ACME" } });

		expect(tx.activityLog.create).not.toHaveBeenCalled();
		expect(tx.user.updateMany).not.toHaveBeenCalled();
	});

	it("does not flag while the fee is unpaid", async () => {
		await audit({ before: { ...paidBefore, fee: { paid: false } } });

		expect(tx.user.updateMany).not.toHaveBeenCalled();
	});
});
