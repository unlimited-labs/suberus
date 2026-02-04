import nodemailer from "nodemailer";
import { prisma } from "@/db";
import type { EmailEventType } from "@/generated/prisma/enums";

const transporter = nodemailer.createTransport({
	host: process.env.SMTP_HOST ?? "localhost",
	port: Number(process.env.SMTP_PORT ?? 1025),
	secure: false,
});

export async function sendEmail(
	eventType: EmailEventType,
	to: string,
	variables: Record<string, string>,
): Promise<void> {
	try {
		const template = await prisma.emailTemplate.findUnique({
			where: { eventType },
		});

		if (!template || !template.isEnabled) return;

		let subject = template.subject;
		let body = template.body;

		for (const [key, value] of Object.entries(variables)) {
			const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
			subject = subject.replace(regex, value);
			body = body.replace(regex, value);
		}

		// Add test run ID header in E2E mode for test isolation
		const headers: Record<string, string> = {};
		if (process.env.E2E === "true" && variables.testRunId) {
			headers["X-Test-Run-Id"] = variables.testRunId;
		}

		await transporter.sendMail({
			from: process.env.SMTP_FROM ?? "conference@suberus.local",
			to,
			cc: template.ccEmails.length > 0 ? template.ccEmails : undefined,
			bcc: template.bccEmails.length > 0 ? template.bccEmails : undefined,
			subject,
			[template.isHtml ? "html" : "text"]: body,
			headers: Object.keys(headers).length > 0 ? headers : undefined,
		});
	} catch (error) {
		// Log error but don't throw - email sending should not break the main flow
		console.error(`Failed to send email (${eventType}):`, error);
	}
}
