import { describe, expect, it } from "vitest";
import { buildRecipientMail } from "./bulk-email-send";

const recipient = {
	email: "ann@x.com",
	firstName: "Ann",
	lastName: "Lee",
	titles: "Paper A, Paper B",
};

describe("buildRecipientMail", () => {
	it("substitutes placeholders into an HTML body (escaping values)", () => {
		const mail = buildRecipientMail(
			{ subject: "Hi {{firstName}}", body: "<p>{{title}}</p>", isHtml: true },
			{ ...recipient, titles: "<b>X</b>" },
		);
		expect(mail.to).toBe("ann@x.com");
		expect(mail.subject).toBe("Hi Ann");
		expect(mail.html).toBe("<p>&lt;b&gt;X&lt;/b&gt;</p>");
		expect(mail.text).toBeUndefined();
	});

	it("routes a plain body to text without escaping", () => {
		const mail = buildRecipientMail(
			{ subject: "Hello", body: "Titles: {{title}}", isHtml: false },
			recipient,
		);
		expect(mail.text).toBe("Titles: Paper A, Paper B");
		expect(mail.html).toBeUndefined();
	});

	it("leaves no {{title}} token when the recipient has no submissions", () => {
		const mail = buildRecipientMail(
			{ subject: "Hi", body: "Your work: {{title}}.", isHtml: false },
			{ ...recipient, titles: "" },
		);
		expect(mail.text).toBe("Your work: .");
		expect(mail.text).not.toContain("{{title}}");
	});
});
