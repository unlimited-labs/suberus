import nodemailer from "nodemailer";
import { prisma } from "@/db.server";
import { env } from "@/env.ts";
import type { EmailEventType } from "@/generated/prisma/enums";
import { logger } from "@/logger.ts";
import { getSetting } from "@/utils/settings.server";

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

const transporter = nodemailer.createTransport({
	host: env.SMTP_HOST,
	port: env.SMTP_PORT,
	secure: env.SMTP_SECURE,
	pool: true,
	maxConnections: 1,
	maxMessages: Infinity,
	connectionTimeout: 10_000,
	greetingTimeout: 10_000,
	socketTimeout: 15_000,
	...(env.SMTP_USER && env.SMTP_PASSWORD
		? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } }
		: {}),
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

		// Append global email footer if configured
		const footer = await getSetting("EMAIL_FOOTER_TEXT");
		if (footer) {
			if (template.isHtml) {
				body += `<hr><p>${escapeHtml(footer)}</p>`;
			} else {
				body += `\n\n---\n${footer}`;
			}
		}

		// Add test run ID header in E2E mode for test isolation
		const headers: Record<string, string> = {};
		if (env.E2E) {
			const testRunIdMatch = to.match(/^[^-]+-([^@]+)@e2e\.local$/);
			if (testRunIdMatch?.[1]) {
				headers["X-Test-Run-Id"] = testRunIdMatch[1];
			}
		}

		await transporter.sendMail({
			from: env.SMTP_FROM_EMAIL,
			to,
			cc: template.ccEmails.length > 0 ? template.ccEmails : undefined,
			bcc: template.bccEmails.length > 0 ? template.bccEmails : undefined,
			subject,
			[template.isHtml ? "html" : "text"]: body,
			headers: Object.keys(headers).length > 0 ? headers : undefined,
		});
		logger.info(`[email] sent ${eventType} to ${to}`);
	} catch (error) {
		// Log error but don't throw - email sending should not break the main flow
		logger.error(`Failed to send email (${eventType}):`, error);
	}
}

export interface SmtpHealthResult {
	status: "healthy" | "error";
	host: string;
	port: number;
	message: string;
}

export async function checkSmtpHealth(): Promise<SmtpHealthResult> {
	const host = env.SMTP_HOST ?? "localhost";
	const port = env.SMTP_PORT;

	try {
		await Promise.race([
			transporter.verify(),
			new Promise((_, reject) =>
				setTimeout(
					() => reject(new Error("SMTP health check timed out")),
					5000,
				),
			),
		]);
		return {
			status: "healthy",
			host,
			port,
			message: "SMTP server is reachable",
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : "Unknown SMTP error";
		logger.warn(`[smtp] health check failed: ${message}`);
		return {
			status: "error",
			host,
			port,
			message,
		};
	}
}

export async function sendTestEmail(
	to: string,
	subject: string,
	body: string,
	isHtml: boolean,
	placeholders: Record<string, string>,
): Promise<void> {
	let resolvedSubject = `[TEST] ${subject}`;
	let resolvedBody = body;

	for (const [key, value] of Object.entries(placeholders)) {
		const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
		resolvedSubject = resolvedSubject.replace(regex, value);
		resolvedBody = resolvedBody.replace(regex, value);
	}

	const footer = await getSetting("EMAIL_FOOTER_TEXT");
	if (footer) {
		if (isHtml) {
			resolvedBody += `<hr><p>${escapeHtml(footer)}</p>`;
		} else {
			resolvedBody += `\n\n---\n${footer}`;
		}
	}

	const mailOptions = {
		from: env.SMTP_FROM_EMAIL,
		to,
		subject: resolvedSubject,
		[isHtml ? "html" : "text"]: resolvedBody,
	};

	// Use a direct transport with retry for one-off test emails
	// to avoid contention with the pooled connection
	const send = async () => {
		const direct = nodemailer.createTransport({
			host: env.SMTP_HOST,
			port: env.SMTP_PORT,
			secure: env.SMTP_SECURE,
			connectionTimeout: 10_000,
			greetingTimeout: 10_000,
			socketTimeout: 15_000,
			...(env.SMTP_USER && env.SMTP_PASSWORD
				? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } }
				: {}),
		});
		try {
			await direct.sendMail(mailOptions);
		} finally {
			direct.close();
		}
	};

	try {
		await send();
		logger.info(`[email] test sent to ${to}`);
	} catch (err) {
		const msg = err instanceof Error ? err.message : "";
		const transient =
			msg.includes("Greeting never received") || msg.includes("ECONN");
		if (!transient) {
			logger.error("[email] test email failed:", err);
			throw err;
		}
		logger.warn(`[smtp] test email transient error, retrying: ${msg}`);
		await new Promise((r) => setTimeout(r, 2_000));
		try {
			await send();
			logger.info(`[email] test sent to ${to} (retry)`);
		} catch (retryErr) {
			logger.error("[email] test email retry failed:", retryErr);
			throw retryErr;
		}
	}
}
