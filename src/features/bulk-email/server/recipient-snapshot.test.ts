import { describe, expect, it } from "vitest";
import { buildRecipientSnapshot } from "./recipient-snapshot";

describe("buildRecipientSnapshot", () => {
	it("joins all submission titles with commas", () => {
		const snap = buildRecipientSnapshot({
			id: "u1",
			email: "a@x.com",
			firstName: "Ann",
			lastName: "Lee",
			submissions: [{ title: "First" }, { title: "Second" }],
		});
		expect(snap).toEqual({
			userId: "u1",
			email: "a@x.com",
			firstName: "Ann",
			lastName: "Lee",
			titles: "First, Second",
		});
	});

	it("yields an empty titles string for users without submissions", () => {
		const snap = buildRecipientSnapshot({
			id: "u2",
			email: "r@x.com",
			firstName: null,
			lastName: null,
			submissions: [],
		});
		expect(snap.titles).toBe("");
	});
});
