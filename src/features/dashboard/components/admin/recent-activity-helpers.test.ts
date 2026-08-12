import { IconCash, IconFileText, IconUser } from "@tabler/icons-react";
import { describe, expect, it } from "vitest";
import { activityLabels } from "@/features/activity-log/labels";
import { ActivityType } from "@/generated/prisma/enums";
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
	performerId: null,
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

	it("renders status and role transitions with friendly labels", () => {
		expect(
			getEventDescription(
				event("SUBMISSION_STATUS_CHANGED", {
					fromStatus: "SUBMITTED",
					toStatus: "UNDER_REVIEW",
				}),
			),
		).toBe("Submitted → Under Review");
		expect(
			getEventDescription(
				event("USER_ROLE_CHANGED", { fromRole: "AUTHOR", toRole: "REVIEWER" }),
			),
		).toBe("Author → Reviewer");
	});

	it("renders a decision and a fee amount with currency", () => {
		expect(
			getEventDescription(event("DECISION_SUBMITTED", { decision: "ACCEPT" })),
		).toBe("ACCEPT");
		expect(
			getEventDescription(
				event("REVIEW_SUBMITTED", { decision: "REVISE_AND_RESUBMIT" }),
			),
		).toBe("REVISE AND RESUBMIT");
		expect(
			getEventDescription(
				event("FEE_MARKED_PAID", { amount: 100, currency: "PLN" }),
			),
		).toBe("100 PLN");
	});

	it("covers detail-bearing types across entities", () => {
		expect(
			getEventDescription(
				event("SUBMISSION_REVISION_UPLOADED", { version: 2 }),
			),
		).toBe("Version 2");
		expect(
			getEventDescription(
				event("DECISION_DESK_REJECT", { reason: "Out of scope" }),
			),
		).toBe("Out of scope");
		expect(
			getEventDescription(event("USER_TOGGLED_ACTIVE", { isActive: false })),
		).toBe("Deactivated");
		expect(
			getEventDescription(
				event("USER_PROFILE_UPDATED", { fields: ["firstName", "country"] }),
			),
		).toBe("Updated: firstName, country");
		expect(
			getEventDescription(
				event("INVITATION_CREATED", { email: "a@b.co", role: "REVIEWER" }),
			),
		).toBe("a@b.co · Reviewer");
		expect(
			getEventDescription(event("EXHIBITOR_APPLIED", { companyName: "ACME" })),
		).toBe("ACME");
		expect(
			getEventDescription(
				event("DOCUMENT_GENERATED", { documentName: "Certificate.pdf" }),
			),
		).toBe("Certificate.pdf");
	});

	it("renders an MCP client registration and its metadata changes", () => {
		expect(
			getEventDescription(
				event("MCP_CLIENT_REGISTERED", {
					clientId: "https://client.example/doc.json",
					clientName: "Claude",
					redirectUris: ["https://client.example/cb"],
				}),
			),
		).toBe("https://client.example/doc.json → https://client.example/cb");
		expect(
			getEventDescription(
				event("MCP_CLIENT_UPDATED", {
					clientId: "https://client.example/doc.json",
					clientName: null,
					redirectUris: [],
					changedFields: ["redirectUris"],
				}),
			),
		).toBe("https://client.example/doc.json · Changed: redirectUris");
	});

	it("shows the author for a deleted submission", () => {
		expect(
			getEventDescription({
				...event("SUBMISSION_DELETED", { title: "Paper", sequentialNumber: 7 }),
				userName: "Ada",
			}),
		).toBe("Author: Ada");
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

	it("shows the deleted submission title snapshot (non-linkable)", () => {
		expect(
			resolveActivitySubject(
				event("SUBMISSION_DELETED", { title: "Paper", sequentialNumber: 7 }),
			),
		).toEqual({ kind: "name", name: "#7 Paper" });
	});

	it("names an MCP client by its declared name, falling back to the client id", () => {
		expect(
			resolveActivitySubject(
				event("MCP_CLIENT_REGISTERED", {
					clientId: "https://client.example/doc.json",
					clientName: "Claude",
					redirectUris: [],
				}),
			),
		).toEqual({ kind: "name", name: "Claude" });
		expect(
			resolveActivitySubject(
				event("MCP_CLIENT_REGISTERED", {
					clientId: "https://client.example/doc.json",
					clientName: null,
					redirectUris: [],
				}),
			),
		).toEqual({ kind: "name", name: "https://client.example/doc.json" });
	});

	it("is none when nothing is linkable", () => {
		expect(resolveActivitySubject(event("SOMETHING"))).toEqual({
			kind: "none",
		});
	});
});

describe("activityLabels", () => {
	it("has a non-empty label for every ActivityType", () => {
		for (const type of Object.values(ActivityType)) {
			expect(activityLabels[type]?.length ?? 0).toBeGreaterThan(0);
		}
	});
});
