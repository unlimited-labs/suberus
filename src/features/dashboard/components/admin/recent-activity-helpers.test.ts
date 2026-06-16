import { IconCash, IconFileText, IconUser } from "@tabler/icons-react";
import { describe, expect, it } from "vitest";
import {
	type ActivityEvent,
	getEventColor,
	getEventDescription,
	getEventIcon,
	resolveActivitySubject,
} from "./recent-activity-helpers";

const event = (
	type: string,
	detail: ActivityEvent["detail"] = null,
): ActivityEvent => ({
	id: "e1",
	type,
	userId: null,
	submissionId: null,
	performerName: null,
	submissionTitle: null,
	userName: null,
	detail,
	createdAt: new Date("2026-01-01"),
});

describe("getEventIcon", () => {
	it("prefers the exact type, then the prefix family", () => {
		expect(getEventIcon("USER_DELETED")).not.toBe(IconUser);
		expect(getEventIcon("USER_CREATED")).toBe(IconUser);
		expect(getEventIcon("FEE_MARKED_PAID")).toBe(IconCash);
		expect(getEventIcon("SOMETHING_ELSE")).toBe(IconFileText);
	});
});

describe("getEventColor", () => {
	it("applies per-type overrides", () => {
		expect(getEventColor("USER_DELETED")).toBe("text-red-600");
		expect(getEventColor("DECISION_DESK_ACCEPT")).toBe("text-green-600");
		expect(getEventColor("REVIEW_OVERDUE")).toBe("text-orange-600");
	});

	it("falls back to the prefix family, then gray", () => {
		expect(getEventColor("USER_CREATED")).toBe("text-indigo-600");
		expect(getEventColor("SUBMISSION_CREATED")).toBe("text-blue-600");
		expect(getEventColor("FEE_MARKED_PAID")).toBe("text-emerald-600");
		expect(getEventColor("UNKNOWN")).toBe("text-gray-600");
	});
});

describe("getEventDescription", () => {
	it("returns null without detail", () => {
		expect(getEventDescription(event("SUBMISSION_STATUS_CHANGED"))).toBeNull();
	});

	it("renders status and role transitions", () => {
		expect(
			getEventDescription(
				event("SUBMISSION_STATUS_CHANGED", {
					fromStatus: "SUBMITTED",
					toStatus: "UNDER_REVIEW",
				}),
			),
		).toBe("SUBMITTED → UNDER_REVIEW");
		expect(
			getEventDescription(
				event("USER_ROLE_CHANGED", { fromRole: "AUTHOR", toRole: "REVIEWER" }),
			),
		).toBe("AUTHOR → REVIEWER");
	});

	it("renders a decision and a fee amount with currency", () => {
		expect(
			getEventDescription(event("DECISION_SUBMITTED", { decision: "ACCEPT" })),
		).toBe("ACCEPT");
		expect(
			getEventDescription(
				event("FEE_MARKED_PAID", { amount: 100, currency: "PLN" }),
			),
		).toBe("100 PLN");
	});

	it("returns null for partial or unhandled details", () => {
		expect(
			getEventDescription(
				event("SUBMISSION_STATUS_CHANGED", { fromStatus: "SUBMITTED" }),
			),
		).toBeNull();
		expect(getEventDescription(event("FEE_MARKED_PAID", {}))).toBeNull();
		expect(getEventDescription(event("SOMETHING_ELSE", { x: "y" }))).toBeNull();
	});
});

describe("resolveActivitySubject", () => {
	it("prefers the submission link when present", () => {
		expect(
			resolveActivitySubject({
				...event("SUBMISSION_CREATED"),
				submissionId: "s1",
				submissionTitle: "Paper",
				userName: "Ada",
			}),
		).toEqual({ kind: "submission", id: "s1", title: "Paper" });
	});

	it("links the affected user for USER_ events", () => {
		expect(
			resolveActivitySubject({
				...event("USER_ROLE_CHANGED"),
				userId: "u1",
				userName: "Ada",
			}),
		).toEqual({ kind: "user", id: "u1", name: "Ada" });
	});

	it("shows a bare name for non-user, non-submission events", () => {
		expect(
			resolveActivitySubject({ ...event("FEE_MARKED_PAID"), userName: "Ada" }),
		).toEqual({ kind: "name", name: "Ada" });
	});

	it("is none when nothing is linkable", () => {
		expect(resolveActivitySubject(event("SOMETHING"))).toEqual({
			kind: "none",
		});
	});
});
