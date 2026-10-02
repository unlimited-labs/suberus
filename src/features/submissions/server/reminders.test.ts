import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = {
	submission: { findMany: vi.fn() },
	sentReminder: {
		createMany: vi.fn(),
		delete: vi.fn(),
		count: vi.fn(),
		findFirst: vi.fn(),
	},
};
const settings: Record<string, unknown> = {};

vi.mock("@/shared/server/db.server", () => ({ prisma: prismaMock }));
vi.mock("@/logger.ts", () => ({
	logger: { info: vi.fn(), debug: vi.fn(), error: vi.fn() },
}));
vi.mock("@/env.ts", () => ({
	env: { APP_BASE_URL: "http://localhost", BULK_EMAIL_DELAY_SECONDS: 0 },
}));
vi.mock("@/features/settings/server/settings", () => ({
	getSetting: vi.fn((key: string) => Promise.resolve(settings[key])),
}));
vi.mock("@/shared/server/email", () => ({ sendEmail: vi.fn() }));

const { sendEmail } = await import("@/shared/server/email");
const sendEmailMock = vi.mocked(sendEmail);
const { sendDeadlineReminders, sendRevisionReminders } =
	await import("./reminders");

const author = {
	id: "u1",
	email: "ada@example.com",
	firstName: "Ada",
	lastName: null,
};

beforeEach(() => {
	vi.useFakeTimers({ now: new Date("2026-04-07T10:00:00Z"), toFake: ["Date"] });
	vi.clearAllMocks();
	Object.assign(settings, {
		REMINDER_DEADLINE_SETTINGS: { enabled: true, daysBefore: [7] },
		REMINDER_REVISION_SETTINGS: { enabled: true, intervalDays: 7, maxCount: 3 },
		SUBMISSION_DEADLINE: "2026-04-10",
		DATE_FORMAT: "DD.MM.YYYY",
		CONFERENCE_TIMEZONE: "Europe/Warsaw",
	});
	prismaMock.sentReminder.createMany.mockResolvedValue({ count: 1 });
	sendEmailMock.mockResolvedValue(true);
});

afterEach(() => {
	vi.useRealTimers();
});

describe("sendDeadlineReminders", () => {
	beforeEach(() => {
		prismaMock.submission.findMany.mockResolvedValue([
			{ id: "s1", title: "Paper", user: author },
		]);
	});

	it("claims, then sends with conference-day counts", async () => {
		expect(await sendDeadlineReminders()).toBe(1);
		expect(prismaMock.sentReminder.createMany).toHaveBeenCalledWith({
			data: [
				{
					userId: "u1",
					reminderType: "DEADLINE_APPROACHING",
					entityId: "s1",
					reminderIndex: 0,
				},
			],
			skipDuplicates: true,
		});
		expect(sendEmailMock).toHaveBeenCalledWith(
			"DEADLINE_APPROACHING",
			"ada@example.com",
			expect.objectContaining({
				recipientName: "Ada",
				deadline: "10.04.2026",
				daysRemaining: "3",
			}),
		);
	});

	it("skips a reminder another run already claimed", async () => {
		prismaMock.sentReminder.createMany.mockResolvedValue({ count: 0 });
		expect(await sendDeadlineReminders()).toBe(0);
		expect(sendEmailMock).not.toHaveBeenCalled();
	});

	it("releases the claim when the mail is not sent", async () => {
		sendEmailMock.mockResolvedValue(false);
		expect(await sendDeadlineReminders()).toBe(0);
		expect(prismaMock.sentReminder.delete).toHaveBeenCalledOnce();
	});

	it("does nothing once the deadline day has ended", async () => {
		vi.setSystemTime(new Date("2026-04-11T00:00:00Z"));
		expect(await sendDeadlineReminders()).toBe(0);
		expect(prismaMock.submission.findMany).not.toHaveBeenCalled();
	});
});

describe("sendRevisionReminders", () => {
	beforeEach(() => {
		prismaMock.submission.findMany.mockResolvedValue([
			{
				id: "s1",
				title: "Paper",
				user: author,
				activityLog: [{ createdAt: new Date("2026-03-30T10:00:00Z") }],
			},
		]);
		prismaMock.sentReminder.findFirst.mockResolvedValue(null);
	});

	it("sends the next reminder once the interval has passed", async () => {
		prismaMock.sentReminder.count.mockResolvedValue(1);
		expect(await sendRevisionReminders()).toBe(1);
		expect(prismaMock.sentReminder.createMany).toHaveBeenCalledWith(
			expect.objectContaining({
				data: [expect.objectContaining({ reminderIndex: 1 })],
			}),
		);
	});

	it("stops at the configured maximum", async () => {
		prismaMock.sentReminder.count.mockResolvedValue(3);
		expect(await sendRevisionReminders()).toBe(0);
		expect(sendEmailMock).not.toHaveBeenCalled();
	});

	it("waits for the interval after the last reminder", async () => {
		prismaMock.sentReminder.count.mockResolvedValue(1);
		prismaMock.sentReminder.findFirst.mockResolvedValue({
			sentAt: new Date("2026-04-05T10:00:00Z"),
		});
		expect(await sendRevisionReminders()).toBe(0);
	});
});
