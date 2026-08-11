import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = {
	invitation: {
		findUnique: vi.fn(),
		update: vi.fn(),
		updateMany: vi.fn(),
		create: vi.fn(),
	},
	user: { findUnique: vi.fn(), update: vi.fn() },
	$transaction: vi.fn(),
};

vi.mock("@/shared/server/db.server", () => ({ prisma: prismaMock }));
vi.mock("@/features/activity-log/server/activity-log", () => ({
	logActivity: vi.fn(),
}));
vi.mock("@/logger.ts", () => ({
	logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("@/env.ts", () => ({ env: { APP_BASE_URL: "http://localhost" } }));
vi.mock("@/features/settings/server/settings", () => ({
	getSetting: vi.fn().mockResolvedValue(72),
}));
vi.mock("@/shared/server/email", () => ({ sendEmail: vi.fn() }));

const { sendEmail } = await import("@/shared/server/email");
const sendEmailMock = vi.mocked(sendEmail);

const {
	cancelInvitation,
	consumeInvitation,
	createInvitation,
	resendInvitation,
} = await import("./invitations");

const invitation = {
	id: "inv-1",
	email: "invitee@x.com",
	role: "EDITOR",
	status: "PENDING",
	expiresAt: new Date(Date.now() + 3_600_000),
};

beforeEach(() => {
	vi.clearAllMocks();
	prismaMock.invitation.findUnique.mockResolvedValue({ ...invitation });
	prismaMock.user.findUnique.mockResolvedValue({
		email: invitation.email,
		role: "AUTHOR",
	});
	prismaMock.$transaction.mockResolvedValue([]);
});

describe("consumeInvitation", () => {
	it("grants the invited role to the invitee", async () => {
		await expect(consumeInvitation("tok", "user-1")).resolves.toEqual({
			success: true,
		});

		expect(prismaMock.user.update).toHaveBeenCalledWith({
			where: { id: "user-1" },
			data: { role: "EDITOR" },
		});
		expect(prismaMock.$transaction).toHaveBeenCalledOnce();
	});

	it("marks the invitation used and the role applied in one transaction", async () => {
		await consumeInvitation("tok", "user-1");

		expect(prismaMock.invitation.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "inv-1" },
				data: expect.objectContaining({
					status: "USED",
					usedById: "user-1",
					roleAppliedAt: expect.any(Date),
				}),
			}),
		);
	});

	it("rejects a redeemer whose email is not the invited one", async () => {
		prismaMock.user.findUnique.mockResolvedValue({
			email: "attacker@evil.com",
		});

		await expect(consumeInvitation("tok", "user-1")).resolves.toEqual({
			success: false,
		});
		expect(prismaMock.user.update).not.toHaveBeenCalled();
	});

	it("burns the token but keeps a role an admin already set", async () => {
		prismaMock.user.findUnique.mockResolvedValue({
			email: invitation.email,
			role: "ADMIN",
		});

		await expect(consumeInvitation("tok", "user-1")).resolves.toEqual({
			success: false,
		});
		expect(prismaMock.user.update).not.toHaveBeenCalled();
		expect(prismaMock.invitation.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ status: "USED" }),
			}),
		);
	});

	it("rejects an expired invitation", async () => {
		prismaMock.invitation.findUnique.mockResolvedValue({
			...invitation,
			expiresAt: new Date(Date.now() - 1),
		});

		await expect(consumeInvitation("tok", "user-1")).resolves.toEqual({
			success: false,
		});
		expect(prismaMock.user.update).not.toHaveBeenCalled();
	});

	it("rejects an already-used invitation", async () => {
		prismaMock.invitation.findUnique.mockResolvedValue({
			...invitation,
			status: "USED",
		});

		await expect(consumeInvitation("tok", "user-1")).resolves.toEqual({
			success: false,
		});
		expect(prismaMock.user.update).not.toHaveBeenCalled();
	});

	it("grants the role when the invite was addressed in mixed case", async () => {
		prismaMock.invitation.findUnique.mockResolvedValue({
			...invitation,
			email: "Invitee@X.com",
		});
		prismaMock.user.findUnique.mockResolvedValue({
			email: "invitee@x.com",
			role: "AUTHOR",
		});

		await consumeInvitation("tok", "user-1");

		expect(prismaMock.user.update).toHaveBeenCalledWith({
			where: { id: "user-1" },
			data: { role: "EDITOR" },
		});
	});
});

describe("createInvitation", () => {
	it("stores the address lower-cased, matching how sign-up persists it", async () => {
		prismaMock.user.findUnique.mockResolvedValue(null);

		await createInvitation("Alice@Uni.Edu", "EDITOR", "admin-1");

		expect(prismaMock.invitation.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ email: "alice@uni.edu" }),
			}),
		);
	});

	it("refuses to invite an address that already has an account", async () => {
		prismaMock.user.findUnique.mockResolvedValue({ id: "u-1" });

		await expect(
			createInvitation("taken@x.com", "EDITOR", "admin-1"),
		).rejects.toThrow(/already exists/i);
		expect(prismaMock.invitation.create).not.toHaveBeenCalled();
	});

	it("looks the existing account up by the normalized address", async () => {
		prismaMock.user.findUnique.mockResolvedValue(null);

		await createInvitation("Alice@Uni.Edu", "EDITOR", "admin-1");

		// Accounts are stored lower-cased, so a raw mixed-case lookup would miss
		// them and happily invite someone who already has an account.
		expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
			where: { email: "alice@uni.edu" },
		});
	});
});

describe("cancelInvitation", () => {
	it("refuses to cancel a used invitation, preserving the audit trail", async () => {
		prismaMock.invitation.findUnique.mockResolvedValue({
			...invitation,
			status: "USED",
		});

		await expect(cancelInvitation("inv-1", "admin-1")).resolves.toEqual({
			success: false,
		});
		expect(prismaMock.invitation.update).not.toHaveBeenCalled();
	});

	it("cancels an expired invitation so it cannot be resent", async () => {
		prismaMock.invitation.findUnique.mockResolvedValue({
			...invitation,
			status: "EXPIRED",
		});

		await cancelInvitation("inv-1", "admin-1");

		expect(prismaMock.invitation.update).toHaveBeenCalledWith(
			expect.objectContaining({ data: { status: "CANCELLED" } }),
		);
	});
});

describe("resendInvitation", () => {
	it("revives a lazily-expired invitation back to PENDING", async () => {
		prismaMock.invitation.findUnique.mockResolvedValue({
			...invitation,
			status: "EXPIRED",
		});
		prismaMock.invitation.update.mockResolvedValue({
			...invitation,
			status: "PENDING",
		});

		await resendInvitation("inv-1");

		expect(prismaMock.invitation.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ status: "PENDING" }),
			}),
		);
	});

	it("reports a swallowed send failure instead of a bare success", async () => {
		prismaMock.invitation.update.mockResolvedValue({ ...invitation });
		sendEmailMock.mockResolvedValueOnce(false);

		await expect(resendInvitation("inv-1")).resolves.toEqual({
			success: false,
		});
	});

	it("refuses to resurrect a used invitation", async () => {
		prismaMock.invitation.findUnique.mockResolvedValue({
			...invitation,
			status: "USED",
		});

		await expect(resendInvitation("inv-1")).resolves.toEqual({
			success: false,
		});
		expect(prismaMock.invitation.update).not.toHaveBeenCalled();
	});
});
